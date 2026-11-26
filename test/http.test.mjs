import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import http from 'node:http';
const root=new URL('..',import.meta.url);
test('HTTP: authenticated local API, origin guard, validation and duplicate submission protection',async()=>{
 const port=23451,origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['server.mjs','--demo','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let output='';
 try{
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
  assert.equal((await fetch(origin+'/api/config')).status,401);assert.equal((await fetch(origin+'/ideal-pipeline.js')).status,200);
  const headers={'X-Relion-Token':token};
  const config=await (await fetch(origin+'/api/config',{headers})).json();assert.equal(config.demo,true);assert.equal(config.catalog.length,23);
  for(const name of ['3D classification','3D auto-refine'])assert.equal(config.layout.find(l=>l.name===name).overrides.trust_ref_size,'No');
  const mask=config.layout.find(l=>l.name==='Mask creation');assert.deepEqual(Object.keys(mask.tabs).slice(0,3),['I/O','Binarisation','Mask']);assert.deepEqual(mask.tabs.Binarisation,['inimask_threshold']);assert(!mask.tabs.Mask.includes('inimask_threshold'));
  assert.equal((await fetch(origin+'/api/map-preview?file=anything.mrc')).status,401);
  const motion=config.layout.find(x=>x.name==='Motion correction');
  const inputs=await (await fetch(origin+`/api/inputs?type=${motion.id}&field=input_star_mics`,{headers})).json();
  assert.equal(inputs.mode,'compatible');assert.deepEqual(inputs.entries.map(e=>e.path),['Import/job001/movies.star']);
  assert(!JSON.stringify(inputs).includes('.Nodes'));
  assert.equal((await fetch(origin+`/api/inputs?type=${motion.id}&field=other_args`,{headers})).status,400);
  const c=await fetch(origin+'/api/config',{headers:{...headers,Origin:'http://untrusted.example'}});assert.equal(c.status,403);
  const host=await new Promise((resolve,reject)=>{http.get(origin+'/api/config',{headers:{...headers,Host:'untrusted.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(host,403);
  const req={type:0,values:{do_raw:'Yes',fn_in_raw:'Movies/*.tiff'},alias:'test'};
  const id=randomUUID(),postHeaders={...headers,'Content-Type':'application/json','X-Request-ID':id};
  const [a,b]=await Promise.all([1,2].map(()=>fetch(origin+'/api/schedule',{method:'POST',headers:postHeaders,body:JSON.stringify(req)}).then(r=>r.json())));assert.equal(a.name,b.name);
  const state=await (await fetch(origin+'/api/state',{headers})).json();assert.equal(state.jobs.length,5);
  const post=async(route,data)=>{const r=await fetch(origin+'/api/'+route,{method:'POST',headers:{...postHeaders,'X-Request-ID':randomUUID()},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
  assert.equal((await post('project-defaults',{values:{nr_threads:'12',nr_mpi:'2',do_queue:'No'}})).status,200);
  assert.equal((await (await fetch(origin+'/api/config',{headers})).json()).executionDefaults.nr_threads,'12');
  assert.equal((await post('project-defaults',{values:{nr_threads:'0'}})).status,400);
  const jobs=state.jobs.filter(j=>j.status==='Scheduled').map(j=>j.name);
  const preview=await post('delete-plan',{jobs,recursive:false});assert.equal(preview.status,200);assert.equal(preview.data.jobs.length,2);
  assert.equal((await post('delete',{plan:preview.data.id})).status,200);
  const trash=await (await fetch(origin+'/api/trash',{headers})).json();assert.equal(trash.entries.length,1);
  const restore=await post('restore-plan',{manifest:trash.entries[0].manifest});assert.equal((await post('undelete',{plan:restore.data.id})).status,200);
  assert.equal((await post('delete-plan',{jobs:[jobs[0],jobs[0]],recursive:false})).status,400);
  const bad=await fetch(origin+'/api/run',{method:'POST',headers:{...postHeaders,'X-Request-ID':randomUUID()},body:JSON.stringify({...req,values:{do_raw:'not-a-boolean'}})});assert.equal(bad.status,400);
  const captured=await post('ideal-capture',{jobs:['Import/job001/','MotionCorr/job002/']});assert.equal(captured.status,200);assert.equal(captured.data.template.steps.length,2);
  const idealPlan=await post('ideal-plan',{template:captured.data.template});assert.equal(idealPlan.status,200);
  const idealRun=await post('ideal-schedule',{plan:idealPlan.data.id});assert.equal(idealRun.status,200);assert.equal(idealRun.data.created.length,2);
  assert.equal((await post('ideal-schedule',{plan:idealPlan.data.id})).status,400);
  const html=await fetch(origin+'/');assert.match(html.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await html.text(),/RelionDeLuxe/);
 }finally{child.kill();await once(child,'exit').catch(()=>{});}
});

test('LAN binding accepts the interface URL and retains token, Host and Origin guards',async t=>{
 const {networkInterfaces}=await import('node:os');
 let address;try{address=Object.values(networkInterfaces()).flat().find(n=>n.family==='IPv4'&&!n.internal)?.address;}catch{}
 const discovered=Boolean(address);
 if(!address){address='127.0.0.1';t.diagnostic('Interface enumeration unavailable; testing wildcard listener via localhost. Remote LAN access requires workstation verification.');}
 const port=23452,origin=`http://${address}:${port}`;
 const child=spawn(process.execPath,['server.mjs','--demo','--host','0.0.0.0','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let output='';
 try{
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',code=>reject(new Error(`Server exited ${code}`)));});
  if(discovered)assert(output.includes(`${origin}/#token=${token}`));
  const request=(headers={})=>new Promise((resolve,reject)=>{http.get(origin+'/api/config',{headers},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
  assert.equal(await request(),401);
  const headers={'X-Relion-Token':token,Origin:origin};
  assert.equal(await request(headers),200);
  assert.equal(await request({...headers,Origin:'http://untrusted.example'}),403);
  assert.equal(await request({...headers,Host:`untrusted.example:${port}`}),403);
  if(discovered)assert.equal(await request({...headers,Host:`127.0.0.1:${port}`}),403);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/config`,{headers:{'X-Relion-Token':token}})).status,200);
 }finally{child.kill();await once(child,'exit').catch(()=>{});}
});
