import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {schedulerStatus} from '../lib/scheduler-status.mjs';
test('scheduler guard log takes priority over native child log; stale markers do not imply liveness',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'sched-status-'));
 try{
  await fs.mkdir(path.join(p,'.reliondeluxe/schedulers'),{recursive:true});
  await fs.writeFile(path.join(p,'pipeline_deluxe_abc.log'),'All jobs have finished\n');
  await fs.writeFile(path.join(p,'.reliondeluxe/guard.log'),'ERROR: required stack.mrcs is missing\n');
  await fs.writeFile(path.join(p,'.reliondeluxe/schedulers/deluxe_abc.json'),JSON.stringify({name:'deluxe_abc',guarded:true,log:'.reliondeluxe/guard.log',ended:'now',exitCode:1}));
  await fs.writeFile(path.join(p,'RUNNING_PIPELINER_deluxe_abc'),'');
  const s=await schedulerStatus(p);
  assert.equal(s.active,false);assert.equal(s.status,'Failed');assert.match(s.line,/ERROR: required stack.mrcs is missing/);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
