import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
import {RescheduleActions,shiftJob} from '../lib/reschedule.mjs';
import {TrashActions,listTrash} from '../lib/trash.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE,fixture=process.env.RELION_RESCHEDULE_FIXTURE;
test('Job-number shift preserves type and padding',()=>{assert.equal(shiftJob('Refine3D/job025/',10),'Refine3D/job035/');assert.equal(shiftJob('Refine3D/job999/',10),'Refine3D/job1009/');});
test('Supplied pipeline: jobs025–033 become jobs035–043, reference job034 and retain shared inputs',{skip:!bridge||!fixture},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'reschedule-case-')),project=path.join(root,'project');
 try{
  await fs.cp(fixture,project,{recursive:true});
  const base=new NativeAdapter(project,path.resolve(bridge)),actions=new RescheduleActions(project,base);
  const before=await base.call(['state']),jobs=before.jobs.filter(j=>/job0(2[5-9]|3[0-3])\//.test(j.name)).map(j=>j.name);assert.equal(jobs.length,9);
  await assert.rejects(actions.preview(jobs,0),/positive/);await assert.rejects(actions.preview(jobs,1),/counter|used/);
  await assert.rejects(actions.preview([jobs[0]],10),/dependent/);
  await fs.writeFile(path.join(project,'RUNNING_PIPELINER_test'),'');await assert.rejects(actions.preview(jobs,10),/scheduler/);await fs.unlink(path.join(project,'RUNNING_PIPELINER_test'));
  await fs.mkdir(path.join(project,'Refine3D/job035'));await assert.rejects(actions.preview(jobs,10),/Destination/);await fs.rmdir(path.join(project,'Refine3D/job035'));
  const stale=await actions.preview(jobs,10);await fs.appendFile(path.join(project,jobs[0],'job.star'),'\n# changed after preview\n');await assert.rejects(actions.execute(stale.id),/changed/);assert.equal((await base.call(['state'])).counter,35);
  const plan=await actions.preview(jobs,10);assert.equal(plan.items.length,9);
  assert.deepEqual(plan.items[0].changes,[{field:'fn_img',from:'CtfRefine/job024/particles_ctf_refine.star',to:'CtfRefine/job034/particles_ctf_refine.star'}]);
  const original={};for(const name of jobs)original[name]=(await base.call(['job',name])).values;
  const result=await actions.execute(plan.id);assert.equal(result.created.length,9);
  const after=await base.call(['state']);assert.equal(after.counter,44);assert.equal(after.jobs.length,before.jobs.length);
  for(const item of plan.items){
   assert(!after.jobs.some(j=>j.name===item.source));assert.equal(after.jobs.find(j=>j.name===item.target).status,'Scheduled');
   const expected={...original[item.source]};for(const change of item.changes)expected[change.field]=change.to;
   assert.deepEqual((await base.call(['job',item.target])).values,expected);
   assert(await fs.stat(path.join(project,'Trash',item.source,'job.star')));
  }
  assert.equal((await base.call(['job','Refine3D/job035/'])).values.fn_mask,'MaskCreate/job020/mask.mrc');
  assert(after.jobs.find(j=>j.name==='CtfRefine/job024/').inputs.includes('CtfRefine/job031/particles_ctf_refine.star'));
  assert(!after.jobs.filter(j=>result.created.includes(j.name)).some(j=>j.inputs.some(i=>jobs.some(old=>i.startsWith(old)))));
  const trash=await listTrash(project);const entry=trash.entries?.[0]||trash.find(e=>e.manifest.includes('job025/'));assert(entry);
  const restores=new TrashActions(base),restore=await restores.preview('restore',entry.manifest);assert.deepEqual(restore.blocked,[]);await restores.execute('restore',restore.id);
  assert.equal((await base.call(['state'])).jobs.length,before.jobs.length+9);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('A failed copy leaves every original intact and reports created replacements',{skip:!bridge||!fixture},async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'reschedule-failure-')),project=path.join(root,'project');
 try{
  await fs.cp(fixture,project,{recursive:true});const base=new NativeAdapter(project,path.resolve(bridge));
  const jobs=(await base.call(['state'])).jobs.filter(j=>/job0(2[5-9]|3[0-3])\//.test(j.name)).map(j=>j.name);
  const actions=new RescheduleActions(project,base),plan=await actions.preview(jobs,10),call=base.call.bind(base);let copies=0;
  base.call=args=>{if(args[0]==='reschedule-copy'&&++copies===2)throw Error('Simulated write failure');return call(args);};
  await assert.rejects(actions.execute(plan.id),/Simulated write failure[\s\S]*Refine3D\/job035/);
  const state=await call(['state']);for(const name of jobs){assert(state.jobs.some(j=>j.name===name));assert(await fs.stat(path.join(project,name,'job.star')));}
  assert(state.jobs.some(j=>j.name==='Refine3D/job035/'&&j.status==='Scheduled'));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
