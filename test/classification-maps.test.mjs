import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {attachClassificationMaps} from '../lib/classification-maps.mjs';
import {keyInfo} from '../lib/job-key-info.mjs';
test('running classes use latest complete map per class and ignore missing/partial maps',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'class-maps-'));
 try{
  const name='Class3D/job003/',dir=path.join(project,name);await fs.mkdir(dir,{recursive:true});
  const map=Buffer.alloc(1056);for(const [o,n] of [[0,2],[4,2],[8,2],[12,2]])map.writeInt32LE(n,o);
  for(const f of ['run_it001_class001.mrc','run_it002_class001.mrc','run_it001_class002.mrc'])await fs.writeFile(path.join(dir,f),map);
  await fs.writeFile(path.join(dir,'run_it002_class002.mrc'),map.subarray(0,1024));
  const outputs=[1,2,3].map(n=>name+'run_it025_class00'+n+'.mrc');
  const state={jobs:[{name,type:9,status:'Running',outputs}]},layout=[{id:9,name:'3D classification'}];
  await attachClassificationMaps(state,project,[],layout);
  assert.deepEqual(state.jobs[0].intermediateMaps,{[outputs[0]]:name+'run_it002_class001.mrc',[outputs[1]]:name+'run_it001_class002.mrc'});
  await fs.writeFile(path.join(dir,'run_it002_class002.mrc'),map);
  await attachClassificationMaps(state,project,[],layout);
  assert.equal(state.jobs[0].intermediateMaps[outputs[1]],name+'run_it002_class002.mrc');
  assert.deepEqual(state.jobs[0].outputs,outputs);
  for(const status of ['Scheduled','Succeeded']){
   const next={jobs:[{name,type:9,status,outputs}]};await attachClassificationMaps(next,project,[],layout);
   assert.equal(next.jobs[0].intermediateMaps,undefined);
  }
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('initial reference key info shows saved symmetry',()=>{
 assert.equal(keyInfo('3D initial reference',{sym_name:'D2'}),'D2');
 assert.equal(keyInfo('3D initial reference',{}),'');
});
