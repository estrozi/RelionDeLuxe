import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {IdealPipelines,validateTemplate} from '../lib/ideal-pipeline.mjs';
import {NativeAdapter} from '../lib/native.mjs';
import {HelicalAdapter,helicalSchema,addHelicalLayout} from '../lib/helical.mjs';
import {ProjectDefaults} from '../lib/project-defaults.mjs';
const exec=promisify(execFile),layout=addHelicalLayout(JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)))),catalog=[...JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url))),helicalSchema];
const make=(kind='refine3d')=>({format:'RelionDeLuxe.ideal-pipeline',version:1,name:'Mask feedback',inputs:{particles:'particles.star',reference:'reference.mrc'},steps:[
 {id:'jobN',type:'relion.'+kind,directory:kind==='refine3d'?'Refine3D':'Class3D',captureCheckpoint:'run_it020_optimiser.star',values:{fn_img:'${input:particles}',fn_ref:'${input:reference}',fn_mask:'${jobN+1}mask.mrc',fn_cont:'',nr_mpi:'1',nr_threads:'1',do_queue:'No',...(kind==='class3d'?{nr_iter:'30',nr_classes:'1'}:{do_solvent_fsc:'Yes'})}},
 {id:'jobN+1',type:'relion.maskcreate',directory:'MaskCreate',values:{fn_in:kind==='refine3d'?'${jobN}run_class001.mrc':'${jobN}run_it020_class001.mrc',inimask_threshold:'0.01'}}]});
test('Mask feedback unfolds into unmasked A, mask B and native continuation C; downstream consumers follow C',()=>{
 for(const kind of ['refine3d','class3d']){
  const t=make(kind);t.steps.push({id:'jobN+2',type:'relion.maskcreate',directory:'MaskCreate',values:{fn_in:'${jobN}run_class001.mrc'}});
  const n=validateTemplate(t,layout,catalog);assert.equal(n.steps.length,4);
  const [a,b,c,d]=n.steps;assert.equal(a.values.fn_mask,'');assert.equal(b.values.fn_in,t.steps[1].values.fn_in);assert.equal(c.continuation.source,a.id);assert.equal(c.values.fn_cont,'${jobN}run_it020_optimiser.star');assert.equal(c.values.fn_mask,'${jobN+1}mask.mrc');assert.equal(d.values.fn_in,'${jobN+2}run_class001.mrc');
  if(kind==='class3d'){assert.equal(a.values.nr_iter,'20');assert.equal(c.values.nr_iter,'30');}else{assert.equal(a.values.do_solvent_fsc,'No');assert.equal(c.values.do_solvent_fsc,'Yes');}
  assert.deepEqual(validateTemplate(n,layout,catalog),n);assert.equal(t.steps.length,3);
 }
 const unknown=make();delete unknown.steps[0].captureCheckpoint;assert.throws(()=>validateTemplate(unknown,layout,catalog),/cannot be inferred/);
 const inferred=make('class3d');delete inferred.steps[0].captureCheckpoint;assert.equal(validateTemplate(inferred,layout,catalog).steps[2].continuation.checkpoint,'run_it020_optimiser.star');
 const unsafe=make();unsafe.steps[0].values.other_args='--solvent_mask elsewhere.mrc';assert.throws(()=>validateTemplate(unsafe,layout,catalog),/conflicting/);
 const incompatible=make();incompatible.steps[1].values.fn_in='${jobN+8}map.mrc';assert.throws(()=>validateTemplate(incompatible,layout,catalog),/Unknown/);
});
const bridge=process.env.RELION_DELUXE_BRIDGE;
for(const kind of ['refine3d','class3d'])test('Native '+kind+' clone is independently scheduled, keeps checkpoint dependencies and survives recapture',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'mask-clone-')),bin=path.join(project,'bin');await fs.mkdir(bin);
 const engine=`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],out=get('--o'),dir=get('--pipeline_control');
if(args.includes('--continue')&&!fs.existsSync(get('--continue')))process.exit(4);
fs.appendFileSync('execution-order.jsonl',JSON.stringify({out,checkpoint:args.includes('--continue')?get('--continue'):null,mask:args.includes('--solvent_mask')?get('--solvent_mask'):null})+'\\n');
if(out.endsWith('.mrc'))fs.writeFileSync(out,'mask fixture');else for(const suffix of ['_it020_optimiser.star','_it020_class001.mrc','_class001.mrc','_data.star','_optimiser.star','_half1_class001_unfil.mrc','_half2_class001_unfil.mrc'])fs.writeFileSync(out+suffix,'fixture '+out);
fs.writeFileSync(dir+'RELION_JOB_EXIT_SUCCESS','');
`;
 await fs.writeFile(path.join(bin,'relion_refine'),engine,{mode:0o700});await fs.writeFile(path.join(bin,'relion_mask_create'),engine,{mode:0o700});
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH},base=new NativeAdapter(project,path.resolve(bridge),env),adapter=new HelicalAdapter(base),service=new IdealPipelines({project,adapter,layout,catalog,defaults:new ProjectDefaults(project)});
 try{
  await adapter.call(['init']);await fs.writeFile(path.join(project,'particles.star'),'data_particles\nloop_\n_rlnImageName #1\n1@images.mrcs\n');await fs.writeFile(path.join(project,'reference.mrc'),'fixture');
  if(kind==='class3d'){const bad=validateTemplate(make(kind),layout,catalog);bad.steps[2].continuation.checkpoint='run_it021_optimiser.star';bad.steps[2].values.fn_cont='${jobN}run_it021_optimiser.star';await assert.rejects(service.preview(bad),/initial classification stops/);}
  const t=make(kind),plan=await service.preview(t);assert.equal((await adapter.call(['state'])).jobs.length,0);assert.equal(plan.items.length,3);assert.match(plan.items[2].command,/--continue .*job001\/run_it020_optimiser.star/);assert.match(plan.items[2].command,/--o .*job003\/run/);assert(!plan.items[0].command.includes('--solvent_mask'));
  const {created}=await service.execute(plan.id),[a,b,c]=created;
  const state=await adapter.call(['state']);assert.equal(state.jobs[2].status,'Scheduled');assert.equal(state.jobs[2].alias,c.split('/')[0]+'/CloneContJob001/');assert(state.jobs[2].inputs.includes(a+'run_it020_optimiser.star'));assert(state.jobs[2].inputs.includes(b+'mask.mrc'));
  const saved=await adapter.call(['job',c]);assert.equal(saved.isContinue,true);assert.match(await fs.readFile(path.join(project,c,'job.star'),'utf8'),/_rlnJobIsContinue\s+1/);
  const l=layout.find(l=>l.label==='relion.'+kind),s=catalog.find(s=>s.id===l.id);
  const preview=await adapter.submit('preview',l,s,saved.values,c,'');assert.match(preview.command,/--continue/);
  await adapter.submit('schedule',l,s,{...saved.values,nr_threads:'2'},c,'');assert.equal((await adapter.call(['job',c])).isContinue,true);
  const recaptured=await service.capture(created);assert.equal(recaptured.template.steps.length,3);assert.equal(recaptured.template.steps[2].continuation.source,'jobN');
  // Exercise the stock scheduler when the optional native test harness is provided.
  if(process.env.RELION_TEST_SCHEDULER){await exec(path.resolve(process.env.RELION_TEST_SCHEDULER),[created.join(' ')],{cwd:project,env,timeout:20000});}else{
   for(const name of created){const data=await adapter.call(['job',name]);await base.call(['run',path.join(project,name,'job.star'),name,'']);for(let i=0;i<100;i++){const state=await adapter.call(['refresh']);if(state.jobs.find(j=>j.name===name).status==='Succeeded')break;await new Promise(r=>setTimeout(r,20));}}
  }
  const records=(await fs.readFile(path.join(project,'execution-order.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);assert.equal(records.length,3);assert.equal(records[0].checkpoint,null);assert.equal(records[0].mask,null);assert.equal(records[2].checkpoint,a+'run_it020_optimiser.star');assert.equal(records[2].mask,b+'mask.mrc');assert.equal(records[2].out,c+'run');
  assert.equal(await fs.readFile(path.join(project,a,'run_it020_optimiser.star'),'utf8'),'fixture '+a+'run');assert.equal((await adapter.call(['refresh'])).jobs.every(j=>j.status==='Succeeded'),true);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Capture recognizes a saved self-continuation mask loop and preserves the checkpoint automatically',async()=>{
 const l=layout.find(l=>l.label==='relion.refine3d'),mask=layout.find(l=>l.label==='relion.maskcreate');
 const jobs=[{name:'Refine3D/job019/',type:l.id,status:'Succeeded',alias:'None'},{name:'MaskCreate/job020/',type:mask.id,status:'Succeeded',alias:'None'}];
 const values=[{fn_img:'particles.star',fn_ref:'reference.mrc',fn_mask:'MaskCreate/job020/mask.mrc',fn_cont:'Refine3D/job019/run_it020_optimiser.star',do_solvent_fsc:'Yes'},{fn_in:'Refine3D/job019/run_class001.mrc'}];
 const adapter={call:async([action,name])=>action==='state'?{jobs}:{type:jobs.find(j=>j.name===name).type,isContinue:true,values:values[jobs.findIndex(j=>j.name===name)]}};
 const service=new IdealPipelines({project:'/project',adapter,layout,catalog,defaults:{forJob:async(_,v)=>v}});
 const result=await service.capture(jobs.map(j=>j.name));assert.equal(result.template.steps.length,3);assert.equal(result.template.steps[2].values.fn_cont,'${jobN}run_it020_optimiser.star');assert(result.warnings.some(w=>w.startsWith('Unfolded')));assert.equal(values[0].fn_mask,'MaskCreate/job020/mask.mrc');
 const t=make('class3d');t.steps[1].values.fn_in='${jobN}run_it030_class001.mrc';const n=validateTemplate(t,layout,catalog);assert.equal(n.steps[1].values.fn_in,'${jobN}run_it020_class001.mrc');assert.equal(n.steps[2].values.nr_iter,'30');
});
test('Continuation metadata rejects self-sources and unsafe checkpoint paths',()=>{
 const normalized=validateTemplate(make(),layout,catalog),clone=normalized.steps[2];
 clone.continuation.source=clone.id;assert.throws(()=>validateTemplate(normalized,layout,catalog),/invalid clone/);
 const traversal=validateTemplate(make(),layout,catalog);traversal.steps[2].continuation.checkpoint='../run_it020_optimiser.star';assert.throws(()=>validateTemplate(traversal,layout,catalog),/invalid clone/);
});
