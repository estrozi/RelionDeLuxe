import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
import {settingsStar} from '../lib/settings.mjs';
import {resolveResources} from '../public/template-resources.js';
import {validateTemplate} from '../lib/ideal-pipeline.mjs';
import {inspectTomography} from '../lib/tomography.mjs';
import {viewerCommand} from '../lib/viewer.mjs';
const layouts=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url)));
const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog-tomo.json',import.meta.url)));
const bridge=process.env.RELION_DELUXE_BRIDGE;
const pair=name=>{const l=layouts.find(l=>l.name===name);return [l,catalog.find(s=>s.id===l.id)];};
test('STA forms and metadata retain native mode and input contracts',()=>{
 assert.equal(layouts.length,24);
 for(const name of ['3D auto-refine','3D classification','3D initial reference']){const [l,s]=pair(name);assert(l.tabs['I/O'].includes('in_optimisation'));assert(!l.tabs['I/O'].includes('fn_img'));assert.match(settingsStar(l,s,{}),/_rlnJobIsTomo 1/);}
 const [l,s]=pair('CTF refinement');assert.equal(l.id,52);assert(s.options.some(f=>f.key==='in_post'));assert.match(settingsStar(l,s,{}),/_rlnJobIsTomo 0/);
 assert.deepEqual(viewerCommand('tilts.star','TomogramGroupMetadata.star.relion'),{executable:'relion_python_tomo_view',args:['tilt-series','--tilt-series-star-file','tilts.star']});
});
test('STA resource defaults and template mode are separate from SPA',()=>{
 const global={globalNcpus:'16',globalNgpus:'2',gpu_ids:'0:1'};
 let [l,s]=pair('3D auto-refine'),v=resolveResources(l,s,{},global);assert.equal(v.nr_mpi,'3');assert.equal(v.nr_threads,'8');
 v=resolveResources(l,s,{}, {globalNcpus:'8',globalNgpus:'4',gpu_ids:''});assert.equal(v.nr_mpi,'5');assert.equal(v.nr_threads,'2');
 [l,s]=pair('Bayesian polishing');v=resolveResources(l,s,{},global);assert.equal(v.nr_mpi,'1');assert.equal(v.nr_threads,'16');
 const t={format:'RelionDeLuxe.ideal-pipeline',version:1,name:'test',inputs:{},steps:[{id:'jobN',type:l.label,directory:'Polish',values:{}}]};
 assert.throws(()=>validateTemplate(t,layouts,catalog),/mode/);assert.equal(validateTemplate({...t,mode:'tomo'},layouts,catalog).mode,'tomo');
});
test('STA nested metadata checks follow optimisation → tomograms → tilts and particles',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-metadata-'));
 try{
  await fs.writeFile(path.join(dir,'set.star'),'data_\n_rlnTomoParticlesFile particles.star\n_rlnTomoTomogramsFile tomograms.star\n');
  await fs.writeFile(path.join(dir,'particles.star'),'data_particles\nloop_\n_rlnTomoName\n_rlnCenteredCoordinateXAngst\n_rlnCenteredCoordinateYAngst\n_rlnCenteredCoordinateZAngst\ntomo1 0 0 0\n');
  await fs.writeFile(path.join(dir,'tomograms.star'),'data_global\nloop_\n_rlnTomoName\n_rlnTomoTiltSeriesStarFile\ntomo1 tilts.star\n');
  await fs.writeFile(path.join(dir,'tilts.star'),'data_tomo1\nloop_\n_rlnMicrographName\nimage.mrc\n');
  let issues=[],refs=[];const args={project:dir,file:'set.star',kind:'optimisation',onIssue:(f,m)=>issues.push(m),onReference:async f=>{refs.push(f);return true;}};
  const result=await inspectTomography(args);assert.equal(result.files,4);assert.equal(result.tomograms,1);assert.deepEqual(issues,[]);assert(refs.includes('tilts.star'));
  await inspectTomography({...args,job:'CTF estimation',values:{use_given_ps:'Yes'}});assert(issues.some(m=>m.includes('rlnCtfPowerSpectrum')));
  issues=[];await inspectTomography({...args,job:'3D auto-refine'});assert(issues.some(m=>m.includes('rlnImageName')));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('Native STA schema, previews, scheduling, mode checks, deletion and restoration',{skip:!bridge},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-native-')),a=new NativeAdapter(dir,path.resolve(bridge),{...process.env,RELIONDELUXE_MODE:'tomo'});
 try{
  assert.deepEqual(await a.call(['schema']),catalog);await a.call(['init']);
  const inputs={
   'Import tilt series':{movie_files:'Movies/*.mrc',mdoc_files:'MDOC/*.mdoc'},
   'Motion correction':{input_star_mics:'Import/job001/tilt_series.star',do_own_motioncor:'Yes'},
   'CTF estimation':{input_star_mics:'MotionCorr/job002/tilt_series.star'},
   'Exclude tilt-images':{in_tiltseries:'CtfFind/job003/tilt_series.star'},
   'Align tilt-series':{in_tiltseries:'ExcludeTiltImages/job004/tilt_series.star',do_aretomo2:'Yes'},
   'Reconstruct tomograms':{in_tiltseries:'AlignTiltSeries/job005/tilt_series.star'},
   'Denoise tomograms':{in_tomoset:'ReconstructTomograms/job006/tomograms.star',do_cryocare_train:'Yes',gpu_ids:'0',tomograms_for_training:'tomo1'},
   'Pick tomograms':{in_tomoset:'ReconstructTomograms/job006/tomograms.star'},
   'Extract subtomos':{in_optimisation:'PickTomo/job007/optimisation_set.star'},
   '3D initial reference':{in_optimisation:'Extract/job008/optimisation_set.star'},
   '3D classification':{in_optimisation:'Extract/job008/optimisation_set.star',fn_ref:'initial.mrc',nr_mpi:'1'},
   '3D auto-refine':{in_optimisation:'Extract/job008/optimisation_set.star',fn_ref:'initial.mrc',nr_mpi:'3'},
   'Reconstruct particle':{in_optimisation:'Refine3D/job010/optimisation_set.star'},
   'CTF refinement':{in_optimisation:'Refine3D/job010/optimisation_set.star',in_halfmaps:'Reconstruct/job011/half1.mrc',in_post:'PostProcess/job012/postprocess.star',in_refmask:'mask.mrc'},
   'Bayesian polishing':{in_optimisation:'CtfRefine/job013/optimisation_set.star',in_halfmaps:'Reconstruct/job011/half1.mrc',in_post:'PostProcess/job012/postprocess.star',in_refmask:'mask.mrc'}
  };
  for(const [name,values]of Object.entries(inputs)){const [l,s]=pair(name);const result=await a.submit('preview',l,s,{...values,do_queue:'No'},'','').catch(e=>{throw Error(name+': '+e.message);});assert(result.commands.length,name);assert(result.inputs,name);}
  const [l,s]=pair('Motion correction');const job=await a.submit('schedule',l,s,inputs['Motion correction'],'','');assert.equal((await a.call(['job',job.name])).type,l.id);
  const spa=new NativeAdapter(dir,path.resolve(bridge),{...process.env,RELIONDELUXE_MODE:'spa'});await assert.rejects(spa.call(['job',job.name]),/mode/);
  const plan=await a.call(['delete-plan',job.name,'false']);assert.deepEqual(plan.blocked,[]);await a.call(['delete',job.name,'false',plan.jobs.map(j=>j.name).join(',')]);
  const manifest='Trash/'+job.name+'deleted_pipeline.star',restore=await a.call(['restore-plan',manifest]);assert.deepEqual(restore.blocked,[]);await a.call(['undelete',manifest,restore.jobs.map(j=>j.name).join(',')]);assert.equal((await a.call(['state'])).jobs.length,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('STA idealized batch resolves resources, preserves mode and schedules native dependencies',{skip:!bridge},async()=>{
 const {IdealPipelines}=await import('../lib/ideal-pipeline.mjs');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sta-batch-')),a=new NativeAdapter(dir,path.resolve(bridge),{...process.env,RELIONDELUXE_MODE:'tomo'});
 try{
  await a.call(['init']);
  const [imp]=pair('Import tilt series'),[motion]=pair('Motion correction'),[ctf]=pair('CTF estimation');
  const template={format:'RelionDeLuxe.ideal-pipeline',version:1,mode:'tomo',name:'STA preparation',inputs:{},steps:[
   {id:'jobN',type:imp.label,directory:'Import',values:{movie_files:'Movies/*.mrc',mdoc_files:'MDOC/*.mdoc'}},
   {id:'jobN+1',type:motion.label,directory:'MotionCorr',values:{input_star_mics:'${jobN}tilt_series.star',do_own_motioncor:'Yes'}},
   {id:'jobN+2',type:ctf.label,directory:'CtfFind',values:{input_star_mics:'${jobN+1}tilt_series.star'}}
  ]};
  const service=new IdealPipelines({project:dir,adapter:a,layout:layouts,catalog,defaults:{read:async()=>({globalNcpus:'4',globalNgpus:'1',do_queue:'No'}),revision:async()=>1,markSaved(){},forJob:async(n,v)=>v}});
  const plan=await service.preview(template);assert.equal(plan.items.length,3);assert.equal(plan.items[1].values.nr_threads,'1');assert(plan.report.some(r=>r.severity==='pending'));
  const result=await service.execute(plan.id);assert.equal(result.created.length,3);const state=await a.call(['state']);assert(state.jobs.every(j=>j.status==='Scheduled'));assert(state.jobs[2].inputs.includes('MotionCorr/job002/tilt_series.star'));
  const captured=await service.capture(state.jobs.map(j=>j.name));assert.equal(captured.template.mode,'tomo');assert.equal(captured.template.steps[1].values.nr_threads,'TBD');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('repeated STA identifiers are reported through optimisation-set inputs',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-ids-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'particles.star'),'data_particles\nloop_\n_rlnTomoName\n_rlnCenteredCoordinateXAngst\n_rlnCenteredCoordinateYAngst\n_rlnCenteredCoordinateZAngst\n_rlnTomoParticleName\nTS_1 0 0 0 TS_1/1\nTS_1 20 0 0 TS_1/1\nTS_1 40 0 0 TS_1/2\n');
 await fs.writeFile(path.join(root,'set.star'),'data_\n_rlnTomoParticlesFile particles.star\n_rlnTomoTomogramsFile tomograms.star\n');
 const issues=[];await inspectTomography({project:root,file:'set.star',kind:'optimisation',job:'Extract subtomos',onReference:async f=>f!=='tomograms.star',onIssue:(file,message)=>issues.push({file,message})});
 assert.equal(issues.length,1);assert.equal(issues[0].file,'particles.star');assert.match(issues[0].message,/1 repeated.*1 extra rows/);assert.match(issues[0].message,/TS_1\/1 \[1, 2\]/);
 const {repeatedTomoIdentifiers}=await import('../lib/tomography.mjs');
 assert.equal(repeatedTomoIdentifiers([{rlnTomoParticleName:'a'},{rlnTomoParticleName:'b'},{}]),null);
});
