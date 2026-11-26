import {duplicateJobs} from '../lib/duplicates.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
const fixture=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
test('Real RELION pipeline: schema, init, preview, scheduling, launch, continuation, aliases, failure, abort', {skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-native-'));
 const a=new NativeAdapter(project,path.resolve(bridge));
 try {
  const schema=await a.call(['schema']);assert.deepEqual(schema,fixture);
  await a.call(['init']);assert.equal((await a.call(['state'])).jobs.length,0);await assert.rejects(a.call(['init']));
  const external=layout.find(x=>x.name==='External');const extSchema=schema.find(x=>x.id===external.id);
  const script=path.join(project,'worker.sh');
  await fs.writeFile(script,'#!/bin/sh\nout="$2"\necho "native test stdout"\necho "native test stderr" >&2\ntouch "${out}/RELION_JOB_EXIT_SUCCESS"\n',{mode:0o700});
  const values={fn_exe:script,do_queue:'No',nr_threads:'1',other_args:''};
  const preview=await a.submit('preview',external,extSchema,values,'','');assert.match(preview.command,/worker.sh/);assert.equal((await a.call(['state'])).jobs.length,0);
  const scheduled=await a.submit('schedule',external,extSchema,values,'','control_test');
  let state=await a.call(['state']);assert.equal(state.jobs.length,1);assert.equal(state.jobs[0].status,'Scheduled');assert.match(state.jobs[0].alias,/control_test/);
  const read=await a.call(['job',scheduled.name]);assert.equal(read.values.fn_exe,script);
  const launched=await a.submit('run',external,extSchema,values,scheduled.name,'');assert.equal(launched.name,scheduled.name);
  for(let i=0;i<30;i++){state=await a.call(['refresh']);if(state.jobs[0].status==='Succeeded')break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(state.jobs[0].status,'Succeeded');assert.match(await fs.readFile(path.join(project,scheduled.name,'run.out'),'utf8'),/native test stdout/);
  assert.match(await fs.readFile(path.join(project,scheduled.name,'run.err'),'utf8'),/native test stderr/);
  const duplicates=await duplicateJobs({project,adapter:a,layout:external,schema:extSchema,values});assert.equal(duplicates.length,1);assert.equal(duplicates[0].name,scheduled.name);
  assert.equal((await duplicateJobs({project,adapter:a,layout:external,schema:extSchema,values:{...values,nr_threads:'2'}})).length,0);
  const continued=await a.submit('continue',external,extSchema,values,scheduled.name,'');assert.equal(continued.name,scheduled.name);
  for(let i=0;i<30;i++){state=await a.call(['refresh']);if(state.jobs[0].status==='Succeeded')break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(state.jobs.length,1);
  await a.call(['alias',scheduled.name,'renamed']);assert.match((await a.call(['state'])).jobs[0].alias,/renamed/);
  await a.call(['mark-failed',scheduled.name]);assert.equal((await a.call(['state'])).jobs[0].status,'Failed');
  // A cooperative long-running external test job exercises the same abort marker as FLTK.
  await fs.writeFile(script,'#!/bin/sh\nout="$2"\nwhile [ ! -f "${out}/RELION_JOB_ABORT_NOW" ]; do sleep 0.1; done\ntouch "${out}/RELION_JOB_EXIT_ABORTED"\n',{mode:0o700});
  await a.submit('continue',external,extSchema,values,scheduled.name,'');await a.call(['abort',scheduled.name]);
  for(let i=0;i<30;i++){state=await a.call(['refresh']);if(state.jobs[0].status==='Aborted')break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(state.jobs[0].status,'Aborted');assert.equal(await fs.stat(path.join(project,'.relion_lock')).catch(()=>null),null);
  // Native validation rejects an invalid import combination before a job is registered.
  const imp=layout.find(x=>x.name==='Import');await assert.rejects(a.submit('preview',imp,schema.find(x=>x.id===imp.id),{do_raw:'Yes',do_other:'Yes'},'',''));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
