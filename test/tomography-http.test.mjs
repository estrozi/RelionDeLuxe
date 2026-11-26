import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {NativeAdapter} from '../lib/native.mjs';
const root=new URL('..',import.meta.url),bridge=process.env.RELION_DELUXE_BRIDGE;
for(const demo of [true,false])test('STA HTTP startup, assets and '+(demo?'demo configuration':'native preflight and scheduling'),{skip:!demo&&!bridge,timeout:20000},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-http-')),port=demo?24782:24783,origin='http://127.0.0.1:'+port;
 let child;
 try{
  if(!demo)await new NativeAdapter(dir,path.resolve(bridge),{...process.env,RELIONDELUXE_MODE:'tomo'}).call(['init']);
  child=spawn(process.execPath,['server.mjs','--tomo','--project',dir,'--port',String(port),...(demo?['--demo']:['--bridge',path.resolve(bridge)])],{cwd:root,stdio:['ignore','pipe','pipe']});let output='';
  child.stderr.on('data',chunk=>output+=chunk);
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code+': '+output)));});
  const headers={'X-Relion-Token':token};const get=async uri=>{const r=await fetch(origin+uri,{headers});assert.equal(r.status,200);return r.json();};
  const post=async(uri,data)=>{const r=await fetch(origin+'/api/'+uri,{method:'POST',headers:{...headers,'Content-Type':'application/json','X-Request-ID':randomUUID()},body:JSON.stringify(data)});const result=await r.json();assert.equal(r.status,200,JSON.stringify(result));return result;};
  const config=await get('/api/config');assert.equal(config.mode,'tomo');assert.equal(config.layout[0].id,50);assert.equal(config.catalog.length,24);assert.equal((await get('/api/state')).jobs.length,0);
  for(const file of ['app.js','template-resources.js','job-ports.js'])assert.match((await fetch(origin+'/'+file)).headers.get('content-type'),/javascript/);
  if(!demo){
   await post('project-defaults',{values:{globalNcpus:'4',globalNgpus:'1',gpu_ids:'',do_queue:'No',fn_ctffind_exe:'',fn_motioncor2_exe:'',fn_resmap:''}});
   const req={type:50,values:{movie_files:'Movies/*.mrc',mdoc_files:'MDOC/*.mdoc'}};
   const warning=await post('schedule',req);assert(warning.verificationWarning);assert(warning.verification.report.some(r=>r.severity==='warning'));
   const scheduled=await post('schedule',{...req,verificationApproval:warning.approval});assert.equal(scheduled.name,'Import/job001/');
   const motion=await post('schedule',{type:1,values:{input_star_mics:'Import/job001/tilt_series.star',do_own_motioncor:'Yes',do_queue:'No'}});assert.equal(motion.name,'MotionCorr/job002/');
   const choices=await get('/api/inputs?type=1&field=input_star_mics');assert(choices.entries.some(e=>e.path==='Import/job001/tilt_series.star'));
  }
 }finally{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}await fs.rm(dir,{recursive:true,force:true});}
});
