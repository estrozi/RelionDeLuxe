import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {schedulerStatus} from '../lib/scheduler-status.mjs';
test('multiple scheduler histories and stale markers stay separate',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'schedulers-'));
 try{
  await fs.writeFile(path.join(root,'pipeline_deluxe_aaa.log'),'Failed job001\n');
  await fs.writeFile(path.join(root,'pipeline_deluxe_bbb.log'),'Finished job002\n');
  await fs.writeFile(path.join(root,'RUNNING_PIPELINER_deluxe_aaa'),'');
  const result=await schedulerStatus(root);
  assert.equal(result.processes.length,2);
  assert(result.processes.every(p=>!p.active));
  assert.match(result.processes.find(p=>p.name==='deluxe_aaa').line,/Stopped with RUNNING marker/);
  assert.equal(result.processes.find(p=>p.name==='deluxe_bbb').recent,'Finished job002');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
