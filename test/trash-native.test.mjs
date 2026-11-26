import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
import {TrashActions,listTrash} from '../lib/trash.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
function graph(state){return state.jobs.map(({name,alias,type,status,inputs,outputs})=>({name,alias,type,status,inputs:[...inputs].sort(),outputs:[...outputs].sort()})).sort((a,b)=>a.name.localeCompare(b.name));}
test('Native recursive Trash and undelete preserve branching graph, settings, aliases and upstream inputs',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-trash-'));const a=new NativeAdapter(project,path.resolve(bridge));const actions=new TrashActions(a);
 try{
  await a.call(['init']);const schema=await a.call(['schema']);
  async function schedule(name,values,alias=''){const l=layout.find(x=>x.name===name);return (await a.submit('schedule',l,schema.find(x=>x.id===l.id),values,'',alias)).name;}
  const root=await schedule('Import',{do_raw:'Yes',do_other:'No',fn_in_raw:'Movies/*.tiff'},'movies');
  const mid=await schedule('Motion correction',{input_star_mics:root+'movies.star'},'aligned');
  const leaf=await schedule('CTF estimation',{input_star_mics:mid+'corrected_micrographs.star'},'ctfs');
  const branch=await schedule('Motion correction',{input_star_mics:root+'movies.star'},'branch');
  const before=await a.call(['state']);const settings=await fs.readFile(path.join(project,mid,'job.star'),'utf8');
  assert.match((await actions.preview('delete',root,false)).blocked.join(' '),/downstream/);
  // Restore a subtree while its upstream producer remains active.
  let plan=await actions.preview('delete',mid,true);assert.deepEqual(plan.jobs.map(j=>j.name),[mid,leaf]);assert.deepEqual(plan.blocked,[]);
  await actions.execute('delete',plan.id);assert.deepEqual((await a.call(['state'])).jobs.map(j=>j.name),[root,branch]);
  assert.equal(await fs.stat(path.join(project,mid)).catch(()=>null),null);
  let entries=await listTrash(project);assert.equal(entries.length,1);
  plan=await actions.preview('restore',entries[0].manifest);assert.deepEqual(plan.blocked,[]);
  await actions.execute('restore',plan.id);assert.deepEqual(graph(await a.call(['state'])),graph(before));
  assert.equal(await fs.readFile(path.join(project,mid,'job.star'),'utf8'),settings);
  assert.equal(await fs.realpath(path.join(project,'MotionCorr/aligned')),await fs.realpath(path.join(project,mid)));
  assert.equal((await listTrash(project)).length,0);
  // Re-delete including the whole branch graph. Changed confirmation scopes fail closed.
  plan=await actions.preview('delete',root,true);assert.equal(plan.jobs.length,4);
  await a.call(['alias',branch,'changed_branch']);await assert.rejects(actions.execute('delete',plan.id),/changed/);
  plan=await actions.preview('delete',root,true);await actions.execute('delete',plan.id);assert.equal((await a.call(['state'])).jobs.length,0);
  entries=await listTrash(project);assert.equal(entries.length,1);const manifest=entries[0].manifest;
  // An existing destination must not be merged or overwritten during undelete.
  await fs.mkdir(path.join(project,root));await fs.writeFile(path.join(project,root,'keep.txt'),'keep');
  plan=await actions.preview('restore',manifest);assert.match(plan.blocked.join(' '),/destination already exists/);await assert.rejects(actions.execute('restore',plan.id));
  assert.equal(await fs.readFile(path.join(project,root,'keep.txt'),'utf8'),'keep');await fs.rm(path.join(project,root),{recursive:true});
  plan=await actions.preview('restore',manifest);await actions.execute('restore',plan.id);assert.equal((await a.call(['state'])).jobs.length,4);
  // RELION normally overwrites an older Trash destination; this adapter rejects it.
  await fs.mkdir(path.join(project,'Trash',leaf),{recursive:true});await fs.writeFile(path.join(project,'Trash',leaf,'keep.txt'),'old');
  plan=await actions.preview('delete',root,true);assert.match(plan.blocked.join(' '),/Trash already contains/);await assert.rejects(actions.execute('delete',plan.id));
  assert.equal(await fs.readFile(path.join(project,'Trash',leaf,'keep.txt'),'utf8'),'old');
  await assert.rejects(actions.preview('restore','../default_pipeline.star'),/Invalid Trash/);
  assert.equal(await fs.stat(path.join(project,'.relion_lock')).catch(()=>null),null);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Native recursive deletion rejects a running descendant',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-running-'));const a=new NativeAdapter(project,path.resolve(bridge));
 try{
  await a.call(['init']);const schema=await a.call(['schema']);const imp=layout.find(x=>x.name==='Import'),ext=layout.find(x=>x.name==='External');
  const root=(await a.submit('schedule',imp,schema.find(x=>x.id===imp.id),{fn_in_raw:'Movies/*.tiff'},'','')).name;
  const worker=path.join(project,'worker.sh');await fs.writeFile(worker,'#!/bin/sh\nout="$2"\nwhile [ ! -f "${out}/RELION_JOB_ABORT_NOW" ]; do sleep 0.1; done\ntouch "${out}/RELION_JOB_EXIT_ABORTED"\n',{mode:0o700});
  const child=(await a.submit('run',ext,schema.find(x=>x.id===ext.id),{fn_exe:worker,in_mov:root+'movies.star'},'','')).name;
  const plan=await a.call(['delete-plan',root,'true']);assert.equal(plan.jobs.length,2);assert.match(plan.blocked.join(' '),/Running job/);
  await assert.rejects(a.call(['delete',root,'true',plan.jobs.map(j=>j.name).join(',')]),/Running job/);assert.equal((await a.call(['state'])).jobs.length,2);
  const batch=await a.call(['delete-many-plan',[root,child].join(','),'true']);assert.equal(batch.jobs.length,2);assert.match(batch.blocked.join(' '),/Running job/);
  await assert.rejects(a.call(['delete-many',[root,child].join(','),'true',batch.jobs.map(j=>j.name).join(',')]),/Running job/);
  await a.call(['abort',child]);for(let i=0;i<30;i++){if((await a.call(['refresh'])).jobs.find(j=>j.name===child).status==='Aborted')break;await new Promise(r=>setTimeout(r,50));}
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Native batch deletion unions selections and restores one group without deleting unselected dependents',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-batch-')),a=new NativeAdapter(project,path.resolve(bridge)),actions=new TrashActions(a);
 try{
  await a.call(['init']);const schema=await a.call(['schema']);
  async function schedule(name,values){const l=layout.find(x=>x.name===name);return (await a.submit('schedule',l,schema.find(x=>x.id===l.id),values,'','')).name;}
  const root=await schedule('Import',{fn_in_raw:'Movies/*.tiff'});
  const child=await schedule('Motion correction',{input_star_mics:root+'movies.star'});
  const separate=await schedule('Import',{fn_in_raw:'Other/*.tiff'});
  const before=graph(await a.call(['state']));
  let plan=await actions.preview('delete',[root,separate],false);assert.match(plan.blocked.join(' '),/downstream/);
  await assert.rejects(actions.execute('delete',plan.id),/downstream/);assert.equal((await a.call(['state'])).jobs.length,3);
  // Parent and its complete dependency set may be selected together without recursion.
  plan=await actions.preview('delete',[root,child],false);assert.deepEqual(plan.blocked,[]);
  await actions.execute('delete',plan.id);assert.deepEqual((await a.call(['state'])).jobs.map(j=>j.name),[separate]);
  let entries=await listTrash(project);assert.equal(entries.length,1);
  let restore=await actions.preview('restore',entries[0].manifest);await actions.execute('restore',restore.id);assert.deepEqual(graph(await a.call(['state'])),before);
  // Overlapping recursive roots are deduplicated into one manifest.
  plan=await actions.preview('delete',[root,child,separate],true);assert.equal(plan.jobs.length,3);
  await a.call(['mark-success',child]);await assert.rejects(actions.execute('delete',plan.id),/changed/);
  plan=await actions.preview('delete',[root,child,separate],true);await actions.execute('delete',plan.id);
  assert.equal((await a.call(['state'])).jobs.length,0);entries=await listTrash(project);assert.equal(entries.length,1);
  restore=await actions.preview('restore',entries[0].manifest);await actions.execute('restore',restore.id);assert.equal((await a.call(['state'])).jobs.length,3);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
