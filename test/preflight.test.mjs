import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {preflight,starRules,missingColumns} from '../lib/preflight.mjs';
import {NativeAdapter} from '../lib/native.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
test('STAR rules distinguish fresh classification, prediction alignment and conditional fields',()=>{
 const fresh=starRules('2D classification','fn_img','ParticleGroupMetadata.star',{});
 assert(!fresh.some(r=>r.all.includes('rlnAngleRot')));
 assert(starRules('CTF refinement','fn_data','ParticleGroupMetadata.star',{}).some(r=>r.all.includes('rlnOriginXAngst')));
 const alternatives=starRules('3D initial helical reference','fn_img','Image2DGroupMetadata.star',{})[0];assert.deepEqual(missingColumns({labels:['rlnReferenceImage']},alternatives),[]);
 assert(starRules('CTF estimation','input_star_mics','MicrographGroupMetadata.star',{use_noDW:'Yes'}).some(r=>r.all.includes('rlnMicrographNameNoDW')));
});
test('Preflight distinguishes future earlier outputs from missing and backward-number inputs',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'preflight-'));
 try{
  let file='CtfRefine/job031/particles.star';
  const jobs=[{name:'CtfRefine/job031/',status:'Scheduled',outputs:[file]}];
  const adapter={call:async()=>({counter:35,jobs}),submit:async()=>({jobName:'Refine3D/job025/',inputs:[{name:file,type:'ParticleGroupMetadata.star'}]})};
  const args={project,adapter,layout:{name:'3D auto-refine'},schema:{options:[{key:'fn_img',type:3,default:''}]},values:{fn_img:file},existing:'Refine3D/job025/',action:'schedule'};
  let result=await preflight(args);assert(result.report.some(r=>r.message.includes('later than')));assert(result.report.some(r=>r.message.includes('does not exist')));
  file='CtfRefine/job024/particles.star';jobs[0]={name:'CtfRefine/job024/',status:'Scheduled',outputs:[file]};args.values.fn_img=file;
  result=await preflight(args);assert.deepEqual(result.report.map(r=>r.severity),['pending']);
  result=await preflight({...args,action:'run'});assert.equal(result.report[0].severity,'warning');
  result=await preflight({...args,action:'scheduler',scheduledBefore:['CtfRefine/job024/']});assert.equal(result.report[0].severity,'pending');
  jobs[0].status='Failed';result=await preflight(args);assert.equal(result.report[0].severity,'warning');
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Native STAR metadata catches missing columns in the correct block',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'star-preflight-'));
 try{
  const native=new NativeAdapter(project,path.resolve(bridge));
  await fs.writeFile(path.join(project,'particles.star'),'data_optics\nloop_\n_rlnOpticsGroup #1\n_rlnImagePixelSize #2\n_rlnVoltage #3\n_rlnSphericalAberration #4\n1 1.2 300 2.7\n\ndata_particles\nloop_\n_rlnImageName #1\n_rlnOpticsGroup #2\n1@stack.mrcs 1\n\n');
  const adapter={call:args=>args[0]==='state'?Promise.resolve({jobs:[],counter:2}):native.call(args),submit:async()=>({jobName:'CtfRefine/job002/',inputs:[{name:'particles.star',type:'ParticleGroupMetadata.star'}]})};
  const report=(await preflight({project,adapter,layout:{name:'CTF refinement'},schema:{options:[{key:'fn_data',type:3,default:''}]},values:{fn_data:'particles.star'}})).report;
  assert(report.some(r=>r.message.includes('rlnAngleRot')));assert(report.some(r=>r.file==='stack.mrcs'&&r.message.includes('Referenced by')));assert(!report.some(r=>r.message.includes('rlnImageName')));
  const table=await native.call(['star-schema',path.join(project,'particles.star'),'optics']);assert.equal(table.rows,1);assert(table.labels.includes('rlnImagePixelSize'));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Native HTTP launch returns an actionable warning before registering a missing-input job',{skip:!bridge},async()=>{
 const {spawn}=await import('node:child_process'),{once}=await import('node:events'),{randomUUID}=await import('node:crypto');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'preflight-http-'));let child;
 try{
  const native=new NativeAdapter(project,path.resolve(bridge));await native.call(['init']);
  child=spawn(process.execPath,['server.mjs','--project',project,'--bridge',path.resolve(bridge),'--port','23455'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});let output='';
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',c=>{output+=c;const m=output.match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',c=>reject(Error('Server exited '+c)));});
  const response=await fetch('http://127.0.0.1:23455/api/run',{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':randomUUID(),'Content-Type':'application/json'},body:JSON.stringify({type:0,values:{do_raw:'Yes',fn_in_raw:'missing/*.mrc'},existing:'',alias:''})});
  const result=await response.json();assert.equal(response.status,200);assert.equal(result.verificationWarning,true);assert(result.verification.report.some(r=>r.message.includes('does not match')));assert(result.approval);assert.equal((await native.call(['state'])).jobs.length,0);
 }finally{if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await once(child,'exit');}await fs.rm(project,{recursive:true,force:true});}
});

test('scheduler accepts an earlier running producer outside the selected batch',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'preflight-running-'));
 try{
  const file='Extract/job089/particles.star';
  const jobs=[{name:'Extract/job089/',status:'Running',outputs:[file]}];
  const adapter={call:async()=>({jobs,counter:92}),submit:async()=>({inputs:[{name:file,type:'ParticleGroupMetadata.star'}]})};
  const result=await preflight({project,adapter,layout:{name:'3D auto-refine'},schema:{options:[]},values:{},existing:'Refine3D/job091/',action:'scheduler'});
  assert.equal(result.report[0].severity,'pending');
  assert.deepEqual(result.dependencies,['Extract/job089/']);
  jobs[0].status='Succeeded';
  assert.equal((await preflight({project,adapter,layout:{name:'3D auto-refine'},schema:{options:[]},values:{},existing:'Refine3D/job091/',action:'scheduler'})).report[0].severity,'warning');
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('STA missing indirect stacks from a running extraction are pending outside the batch',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'preflight-sta-running-'));
 try{
  const file='Extract/job089/particles.star',ref='Extract/job089/Subtomograms/TS_54/6435_stack2d.mrcs';
  await fs.mkdir(path.join(project,'Extract/job089'),{recursive:true});
  await fs.writeFile(path.join(project,file),'data_particles\nloop_\n_rlnTomoName #1\n_rlnCenteredCoordinateXAngst #2\n_rlnCenteredCoordinateYAngst #3\n_rlnCenteredCoordinateZAngst #4\n_rlnImageName #5\nTS_54 0 0 0 1@'+ref+'\n');
  const jobs=[{name:'Extract/job089/',status:'Running',outputs:[file]}];
  const adapter={call:async()=>({jobs,counter:92}),submit:async()=>({inputs:[{name:file,type:'ParticleGroupMetadata.star'}]})};
  const result=await preflight({project,adapter,layout:{name:'3D auto-refine',mode:'tomo'},schema:{options:[]},values:{},existing:'Refine3D/job091/',action:'scheduler'});
  assert.ok(result.report.some(r=>r.file===ref&&r.severity==='pending'),JSON.stringify(result));
  assert.ok(!result.report.some(r=>r.file===ref&&r.severity==='warning'));
  assert.deepEqual(result.dependencies,['Extract/job089/']);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
