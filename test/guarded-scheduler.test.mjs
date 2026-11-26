import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
const runner=new URL('../scripts/guarded-scheduler.mjs',import.meta.url).pathname;
async function fixture(){
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'guarded-scheduler-'));
 const producer='Extract/job001/',job='Refine3D/job002/';
 for(const name of [producer,job])await fs.mkdir(path.join(project,name),{recursive:true});
 const bridge=path.join(project,'bridge.py'),pipeliner=path.join(project,'pipeliner.py');
 await fs.writeFile(bridge,`#!/usr/bin/env python3
import json,sys,pathlib
p=pathlib.Path('.')
s=json.loads((p/'state.json').read_text())
a=sys.argv[1]
if a in ['state','refresh']: r=s
elif a=='job': r={'type':10,'isContinue':False,'values':{}}
elif a=='preview': r={'inputs':[{'name':'Extract/job001/map.mrc','type':'DensityMap.mrc'}],'commands':[]}
elif a=='schedule':
 s['jobs'][1]['status']='Scheduled';(p/'state.json').write_text(json.dumps(s));r={}
else: raise Exception(a)
print('@@RELIONDELUXE@@'+json.dumps(r))
`,{mode:0o700});
 await fs.writeFile(pipeliner,`#!/usr/bin/env python3
import json,pathlib,sys
p=pathlib.Path('.');s=json.loads((p/'state.json').read_text())
assert s['jobs'][0]['status']=='Succeeded'
assert (p/'Extract/job001/map.mrc').exists()
with (p/'launches').open('a') as f:f.write('launch\\n')
s['jobs'][1]['status']='Succeeded';(p/'state.json').write_text(json.dumps(s))
(p/('RUNNING_PIPELINER_'+sys.argv[sys.argv.index('--schedule')+1])).unlink(missing_ok=True)
`,{mode:0o700});
 await fs.writeFile(path.join(project,job,'job.star'),'data_job\n_rlnJobIsContinue 0\n');
 const jobs=[{name:producer,status:'Running',outputs:[producer+'map.mrc'],type:51},{name:job,status:'Scheduled',outputs:[],type:10}];
 const write=()=>fs.writeFile(path.join(project,'state.json'),JSON.stringify({counter:3,jobs}));
 await write();
 const plan={project,name:'deluxe_test',bridge,pipeliner,readRoots:[],repeat:1,before:0,wait:0,prepared:[{job,dependencies:[producer],data:{isContinue:false},l:{id:10,name:'3D auto-refine',label:'relion.refine3d'},s:{options:[]}}]};
 return {project,plan,jobs,write};
}
async function start(f){
 const file=path.join(f.project,'plan.json');await fs.writeFile(file,JSON.stringify(f.plan));
 const child=spawn(process.execPath,[runner,file],{cwd:f.project,stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>resolve({code,output}));});
 return {child,done,output:()=>output};
}
test('guard waits for external producer, then executes and repeats native scheduler',{timeout:25000},async()=>{
 const f=await fixture();let proc;
 try{
  f.plan.repeat=2;f.plan.before=.002;
  proc=await start(f);
  const deadline=Date.now()+5000;
  while(!proc.output().includes('Waiting for')&&Date.now()<deadline)await new Promise(r=>setTimeout(r,20));
  assert.match(proc.output(),/Waiting for Extract\/job001/);
  assert.equal(await fs.access(path.join(f.project,'launches')).then(()=>true,()=>false),false);
  f.jobs[0].status='Succeeded';await fs.writeFile(path.join(f.project,'Extract/job001/map.mrc'),'map');await f.write();
  const r=await proc.done;
  assert.equal(r.code,0,r.output);
  assert.equal((await fs.readFile(path.join(f.project,'launches'),'utf8')).trim().split('\n').length,2);
 }finally{proc?.child.kill();await fs.rm(f.project,{recursive:true,force:true});}
});
for(const status of ['Failed','Aborted','Succeeded'])test('guard refuses missing inputs after producer '+status,async()=>{
 const f=await fixture();let proc;
 try{
  f.jobs[0].status=status;await f.write();proc=await start(f);const r=await proc.done;
  assert.equal(r.code,1,r.output);assert.match(r.output,status==='Succeeded'?/Input file does not exist/:new RegExp(status));
  assert.equal(await fs.access(path.join(f.project,'launches')).then(()=>true,()=>false),false);
 }finally{proc?.child.kill();await fs.rm(f.project,{recursive:true,force:true});}
});
