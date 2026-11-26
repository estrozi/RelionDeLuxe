import test from 'node:test';
import assert from 'node:assert/strict';
import {nextJobInputs,suggestedNextJob} from '../public/workspace-feed.js';
test('next subset draft uses selected class optimiser and clears alternatives',()=>{
 const target={name:'Subset selection'};
 for(const status of ['Running','Scheduled','Succeeded']){
  assert.deepEqual(nextJobInputs({status,outputs:['Class3D/job028/run_it025_data.star','Class3D/job028/run_it025_optimiser.star']},target),{fn_model:'Class3D/job028/run_it025_optimiser.star',fn_mic:'',fn_data:''});
 }
 assert.deepEqual(nextJobInputs({outputs:[]},target),{});
});

test('next mask draft prefers final reconstruction then first half, without inventing filenames',()=>{
 const target={name:'Mask creation'},prefix='Refine3D/job030/';
 const halves=[prefix+'run_half2_class001_unfil.mrc',prefix+'run_half1_class001_unfil.mrc'];
 assert.deepEqual(nextJobInputs({outputs:[...halves,prefix+'run_class001.mrc']},target),{fn_in:prefix+'run_class001.mrc'});
 assert.deepEqual(nextJobInputs({outputs:halves},target),{fn_in:halves[1]});
 assert.deepEqual(nextJobInputs({outputs:[prefix+'run_data.star']},target),{});
});

test('next refinement uses the selected last scheduled CTF refinement output',()=>{
 const jobs=[36,37,38].map(n=>({name:'CtfRefine/job0'+n+'/',status:'Scheduled',outputs:['CtfRefine/job0'+n+'/particles_ctf_refine.star']}));
 assert.deepEqual(nextJobInputs(jobs[2],{name:'3D auto-refine'}),{fn_img:'CtfRefine/job038/particles_ctf_refine.star'});
});

test('next refinement combines latest refinement reference with selected CTF particle output',()=>{
 const target={name:'3D auto-refine'},layout=[{id:10,name:target.name}];
 const jobs=[30,33,32].map(n=>({type:10,name:'Refine3D/job0'+n+'/',status:'Succeeded',outputs:['Refine3D/job0'+n+'/run_class001.mrc']}));
 jobs.push({type:10,name:'Refine3D/job039/',status:'Failed',outputs:['Refine3D/job039/run_class001.mrc']});
 const source={outputs:['CtfRefine/job038/particles_ctf_refine.star']};
 assert.deepEqual(nextJobInputs(source,target,jobs,layout),{fn_img:source.outputs[0],fn_ref:'Refine3D/job033/run_class001.mrc'});
 assert.deepEqual(nextJobInputs(source,target,[],layout),{fn_img:source.outputs[0]});
});

test('training next-job is polishing in Polish mode; polishing next-job remains auto-refine',()=>{
 const layout=[{id:20,name:'Bayesian polishing'},{id:10,name:'3D auto-refine'}];
 for(const status of ['Scheduled','Running','Succeeded']){
  const job={type:20,status,outputs:['Polish/job040/opt_params_all_groups.txt']};
  const next=suggestedNextJob(job,{do_param_optim:'Yes',do_polish:'No'},layout);
  assert.equal(next.id,20);
  assert.deepEqual(nextJobInputs(job,next),{do_param_optim:'No',do_polish:'Yes',opt_params:job.outputs[0]});
  assert.equal(suggestedNextJob(job,{do_param_optim:'No',do_polish:'Yes'},layout).id,10);
 }
});

test('refinement next step uses saved mask rather than unsaved editor changes',()=>{
 const layout=[{id:10,name:'3D auto-refine'},{id:12,name:'Mask creation'},{id:13,name:'Post-processing'}];
 for(const mode of ['spa','tomo']){
  assert.equal(suggestedNextJob({type:10,refinementMask:''},{fn_mask:'unsaved.mrc'},layout,mode).id,12);
  assert.equal(suggestedNextJob({type:10,refinementMask:'MaskCreate/job002/mask.mrc'},{fn_mask:''},layout,mode).id,13);
  assert.equal(suggestedNextJob({type:10},{fn_mask:'mask.mrc'},layout,mode).id,13);
  assert.equal(suggestedNextJob({type:10},{fn_mask:'  '},layout,mode).id,12);
 }
});

test('STA auto-refine uses direct particles rather than SPA fn_img',async()=>{
 const fs=await import('node:fs/promises');
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url),'utf8'));
 const target=layout.find(l=>l.name==='3D auto-refine');
 for(const status of ['Succeeded','Scheduled','Running']){
  const result=nextJobInputs({status,outputs:['External/job010/particles.star','External/job010/run_it025_dominantclass.mrc']},target,[],layout);
  assert.equal(result.in_particles,'External/job010/particles.star');assert.equal(result.use_direct_entries,'Yes');assert.equal(result.in_optimisation,'');assert.ok(!('fn_img' in result));
 }
});

test('cryoCARE training next step is prediction with the trained model',()=>{
 const layout=[{id:58,name:'Denoise tomograms'},{id:59,name:'Pick tomograms'}];
 const job={type:58,outputs:['Denoise/job007/denoising_model.tar.gz']};
 const target=suggestedNextJob(job,{do_cryocare_train:'Yes'},layout,'tomo');
 assert.equal(target.id,58);
 assert.deepEqual(nextJobInputs(job,target),{do_cryocare_train:'No',do_cryocare_predict:'Yes',care_denoising_model:job.outputs[0]});
 assert.equal(suggestedNextJob(job,{do_cryocare_train:'No'},layout,'tomo').id,59);
});

test('STA extraction next drafts use its optimisation output and compatible reconstruction settings',async()=>{
 const fs=await import('node:fs/promises');
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url),'utf8'));
 const source={type:51,outputs:['Extract/job008/optimisation_set.star','Extract/job008/particles.star']};
 const values={binning:'4',box_size:'128',crop_size:'64'};
 assert.equal(suggestedNextJob(source,values,layout,'tomo').name,'3D initial reference');
 for(const name of ['3D initial reference','Reconstruct particle']){
  const target=layout.find(l=>l.name===name),result=nextJobInputs(source,target,[],layout,values);
  assert.equal(result.in_optimisation,source.outputs[0]);
  assert.equal(result.use_direct_entries,'No');
  assert.equal(result.in_particles,'');
  assert.ok(!('fn_img' in result));
  if(name==='Reconstruct particle')for(const key of Object.keys(values))assert.equal(result[key],values[key]);
 }
});

test('scheduled jobs offer next steps even before the end of the pipeline',async()=>{
 const {nextJobSource}=await import('../public/workspace-feed.js');
 const jobs=[
  {name:'Class2D/job006/',type:9,status:'Scheduled',outputs:['Class2D/job006/run_it025_optimiser.star']},
  {name:'Extract/job007/',type:6,status:'Succeeded'}
 ];
 assert.equal(nextJobSource(jobs,jobs[0].name),jobs[0]);
 assert.equal(nextJobSource(jobs,jobs[1].name),jobs[1]);
 assert.equal(nextJobSource(jobs,null),null);
 const layout=[{id:9,name:'2D classification'},{id:7,name:'Subset selection'}];
 const target=suggestedNextJob(jobs[0],{},layout);
 assert.equal(nextJobInputs(nextJobSource(jobs,jobs[0].name),target).fn_model,jobs[0].outputs[0]);
 jobs[0].status='Succeeded';
 assert.equal(nextJobSource(jobs,jobs[0].name),null);
});

test('STA Reconstruct particle offers refinement and seeds both refinement and classification',async()=>{
 const fs=await import('node:fs/promises');
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url),'utf8'));
 for(const status of ['Scheduled','Running','Succeeded']){
  const job={type:54,name:'Reconstruct/job010/',status,outputs:['Reconstruct/job010/half2.mrc','Reconstruct/job010/half1.mrc']};
  const target=suggestedNextJob(job,{},layout,'tomo');
  assert.equal(target.name,'3D auto-refine');
  for(const name of ['3D auto-refine','3D classification']){
   const target=layout.find(l=>l.name===name);
   const result=nextJobInputs(job,target,[],layout,{in_optimisation:'Extract/job009/optimisation_set.star',use_direct_entries:'No',sym_name:'C2'});
   assert.equal(result.fn_ref,'Reconstruct/job010/half1.mrc');
   assert.equal(result.in_optimisation,'Extract/job009/optimisation_set.star');
   assert.equal(result.use_direct_entries,'No');
   assert.equal(result.sym_name,'C2');
   const direct=nextJobInputs(job,target,[],layout,{use_direct_entries:'Yes',in_particles:'Extract/job009/particles.star',in_tomograms:'Tomograms/job006/tomograms.star'});
   assert.equal(direct.in_particles,'Extract/job009/particles.star');
   assert.equal(direct.in_tomograms,'Tomograms/job006/tomograms.star');
   assert.equal(direct.in_optimisation,'');
  }
 }
});

test('Reconstruct particle never supplies a fictitious optimisation output to next jobs',async()=>{
 const fs=await import('node:fs/promises');
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url),'utf8'));
 const source={type:54,outputs:['Reconstruct/job010/optimisation_set.star','Reconstruct/job010/merged.mrc']};
 for(const name of ['3D auto-refine','3D classification']){
  const target=layout.find(l=>l.name===name);
  const result=nextJobInputs(source,target,[],layout,{in_optimisation:'Extract/job009/optimisation_set.star',use_direct_entries:'No'});
  assert.equal(result.in_optimisation,'Extract/job009/optimisation_set.star');
  const direct=nextJobInputs(source,target,[],layout,{use_direct_entries:'Yes',in_particles:'Extract/job009/particles.star'});
  assert.equal(direct.in_optimisation,'');
  assert.equal(direct.in_particles,'Extract/job009/particles.star');
 }
});

test('classification alternative inherits pending Subset selection particles in SPA and STA',async()=>{
 const fs=await import('node:fs/promises');
 for(const mode of ['spa','tomo']){
  const layout=JSON.parse(await fs.readFile(new URL('../public/layout'+(mode==='tomo'?'-tomo':'')+'.json',import.meta.url),'utf8'));
  for(const status of ['Running','Scheduled']){
   const source={status,outputs:['Select/job020/particles.star']};
   const result=nextJobInputs(source,layout.find(l=>l.name==='3D classification'),[],layout);
   assert.equal(result[mode==='tomo'?'in_particles':'fn_img'],source.outputs[0]);
  }
 }
});
