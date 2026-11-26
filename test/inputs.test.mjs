import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {matchesPattern,nodeGroup,inputField,compatibleInputs,filesystemInputs} from '../lib/inputs.mjs';
import {NativeAdapter} from '../lib/native.mjs';
const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
const bridge=process.env.RELION_DELUXE_BRIDGE;
test('Input filters follow FLTK patterns and preserve node subtype depth',()=>{
 assert(matchesPattern('a.mrc.zst','Movie (*.{mrc,tiff,mrc.zst})'));
 assert(!matchesPattern('a.star','Movie (*.{mrc,tiff,mrc.zst})'));
 assert(matchesPattern('a.mrcs','STAR (*.star)\tImage (*.{spi,mrcs})'));
 assert(!matchesPattern('half2.mrc','MRC (*half1*.mrc)'));
 assert(matchesPattern('run_it010_optimiser.star','STAR (run_it*_optimiser.star)'));
 assert(!matchesPattern('run_it010_data.star','STAR (run_it*_optimiser.star)'));
 assert.equal(nodeGroup({type:3,nodeType:'DensityMap.mrc.halfmap',nodeDepth:3}),'DensityMap.mrc.halfmap');
 assert.throws(()=>nodeGroup({type:3,nodeType:'DensityMap.mrc'}),/Rebuild/);
 assert.throws(()=>inputField(catalog,0,'../secret'));
});
test('Typed input index excludes stale, wrong-subtype and unsafe markers; raw picker filters formats',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-inputs-'));
 try{
  const field={type:3,nodeType:'DensityMap.mrc.halfmap',nodeDepth:3,pattern:'MRC (*half1*.mrc)'};
  const names=['Refine3D/job001/run_half1.mrc','Refine3D/job001/run_half2.mrc','Refine3D/job001/stale_half1.mrc','Refine3D/job001/wrong_half1.mrc'];
  await fs.mkdir(path.join(project,'Refine3D/job001'),{recursive:true});
  for(const name of names){await fs.mkdir(path.dirname(path.join(project,'.Nodes',nodeGroup(field),name)),{recursive:true});await fs.writeFile(path.join(project,'.Nodes',nodeGroup(field),name),'');await fs.writeFile(path.join(project,name),'map');}
  const state={jobs:[{name:'Refine3D/job001/',alias:'None',status:'Succeeded',outputs:names}],nodes:names.filter(n=>!n.includes('stale')).map(name=>({name,type:name.includes('wrong')?'DensityMap.mrc':'DensityMap.mrc.halfmap'}))};
  assert.deepEqual((await compatibleInputs(project,[],field,state)).entries.map(e=>e.path),[names[0]]);
  await fs.unlink(path.join(project,names[0]));assert.equal((await compatibleInputs(project,[],field,state)).entries.length,0);
  await fs.writeFile(path.join(project,'raw.star'),'');await fs.writeFile(path.join(project,'raw.tiff'),'');
  await fs.symlink('/etc',path.join(project,'escape'));
  const raw=await filesystemInputs(project,[],'.',{pattern:'Movies (*.{tif,tiff})'});
  assert(raw.entries.some(e=>e.name==='raw.tiff'));assert(!raw.entries.some(e=>['raw.star','escape','.Nodes'].includes(e.name)));
  const groupRoot=path.join(project,'.Nodes',nodeGroup(field));await fs.rename(groupRoot,groupRoot+'.saved');await fs.symlink(groupRoot+'.saved',groupRoot);
  await assert.rejects(compatibleInputs(project,[],field,state),/not a regular directory/);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Actual RELION node markers resolve aliases, scheduled outputs and changes after Trash/restore',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-input-native-')),a=new NativeAdapter(project,path.resolve(bridge));
 try{
  await a.call(['init']);const schema=await a.call(['schema']);
  async function schedule(name,values,alias){const l=layout.find(x=>x.name===name);return (await a.submit('schedule',l,schema.find(x=>x.id===l.id),values,'',alias)).name;}
  const imp=await schedule('Import',{fn_in_raw:'Movies/*.tiff'},'movies');
  const motion=await schedule('Motion correction',{input_star_mics:imp+'movies.star'},'aligned');
  const motionField=inputField(schema,layout.find(x=>x.name==='Motion correction').id,'input_star_mics');
  const ctfField=inputField(schema,layout.find(x=>x.name==='CTF estimation').id,'input_star_mics');
  let state=await a.call(['state']);
  let result=await compatibleInputs(project,[],motionField,state);assert.equal(result.entries.length,1);assert.equal(result.entries[0].path,imp+'movies.star');assert.equal(result.entries[0].alias,'Import/movies/');assert.equal(result.entries[0].available,false);
  assert.deepEqual((await compatibleInputs(project,[],ctfField,state)).entries.map(e=>e.path),[motion+'corrected_micrographs.star']);
  assert.equal((await compatibleInputs(project,[],motionField,state,{query:'not-found'})).entries.length,0);
  assert.equal((await compatibleInputs(project,[],motionField,state,{query:'movies'})).entries.length,1);
  await fs.writeFile(path.join(project,imp,'movies.star'),'data_movies\nloop_\n_rlnMicrographMovieName #1\nMovies/a.tiff\n');
  await a.call(['mark-success',imp]);await a.call(['alias',imp,'renamed_movies']);state=await a.call(['state']);
  result=await compatibleInputs(project,[],motionField,state);assert.equal(result.entries[0].available,true);assert.equal(result.entries[0].alias,'Import/renamed_movies/');
  const plan=await a.call(['delete-plan',imp,'true']);await a.call(['delete',imp,'true',plan.jobs.map(j=>j.name).join(',')]);
  assert.equal((await compatibleInputs(project,[],motionField,await a.call(['state']))).entries.length,0);
  await a.call(['undelete','Trash/'+imp+'deleted_pipeline.star',plan.jobs.map(j=>j.name).join(',')]);
  assert.equal((await compatibleInputs(project,[],motionField,await a.call(['state']))).entries[0].path,imp+'movies.star');
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Extraction picker offers native imported coordinate suffix descriptors without mixing input types',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-coords-')),a=new NativeAdapter(project,path.resolve(bridge));
 try{
  await a.call(['init']);const schema=await a.call(['schema']),imp=layout.find(l=>l.name==='Import'),extract=layout.find(l=>l.name==='Particle extraction');
  const job=(await a.submit('schedule',imp,schema.find(s=>s.id===imp.id),{do_raw:'No',do_other:'Yes',fn_in_other:'Coordinates/*.box',node_type:'Particle coordinates (*.box, *_pick.star)'},'','box_coordinates')).name;
  // Import's descriptor records the coordinate directory; it is not a STAR table.
  await fs.writeFile(path.join(project,job,'coords_suffix.box'),'Coordinates/\n');await a.call(['mark-success',job]);
  const state=await a.call(['state']),field=inputField(schema,extract.id,'coords_suffix');
  const result=await compatibleInputs(project,[],field,state);
  assert.deepEqual(result.entries.map(e=>e.path),[job+'coords_suffix.box']);assert.equal(result.entries[0].available,true);
  assert.equal((await compatibleInputs(project,[],inputField(schema,extract.id,'star_mics'),state)).entries.length,0);
  const {matchesInputFile}=await import('../lib/inputs.mjs');
  assert(matchesInputFile('coords_suffix_autopick.box',field));assert(matchesInputFile('coords_suffix.coords',field));assert(matchesInputFile('coordinates.star',field));
  assert(!matchesInputFile('mic001.box',field));assert(!matchesInputFile('coords_suffix.box',inputField(schema,extract.id,'star_mics')));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Continuation picker filters by pipeline job type and offers only latest ready optimiser per job',async()=>{
 const {continuationInputs}=await import('../lib/inputs.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-cont-'));
 try{
  const class2=layout.find(l=>l.name==='2D classification'),class3=layout.find(l=>l.name==='3D classification');
  const field=inputField(catalog,class2.id,'fn_cont');
  const jobs=[{name:'Class2D/job001/',alias:'Class2D/comparison/',type:class2.id,status:'Succeeded'},{name:'Class3D/job002/',alias:'None',type:class3.id,status:'Succeeded'}];
  for(const j of jobs){await fs.mkdir(path.join(project,j.name),{recursive:true});for(const name of ['run_it001_optimiser.star','run_it025_optimiser.star','run_it025_data.star'])await fs.writeFile(path.join(project,j.name,name),name.endsWith('_optimiser.star')?'data_optimiser_general\n_rlnModelStarFile '+j.name+'run_it025_data.star\n_rlnExperimentalDataStarFile '+j.name+'run_it025_data.star\n':'checkpoint');}
  await fs.mkdir(path.join(project,'Class2D/job999'),{recursive:true});await fs.writeFile(path.join(project,'Class2D/job999/run_optimiser.star'),'unregistered job');
  await fs.symlink(path.join(project,jobs[1].name),path.join(project,jobs[0].name,'wrong_type_link'));
  const state={jobs,nodes:[]},result=await continuationInputs(project,[],field,state,class2.id);
  assert.deepEqual(result.entries.map(e=>e.path),['Class2D/job001/run_it025_optimiser.star']);
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{query:'comparison'})).entries.length,1);
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{query:'job002'})).entries.length,0);
  assert.equal((await continuationInputs(project,[],field,state,class3.id)).entries[0].job,'Class3D/job002/');
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{job:'Class2D/job001/'})).entries.length,1);
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{job:'Class3D/job002/'})).entries.length,0);
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{job:''})).entries.length,0);

  await fs.writeFile(path.join(project,jobs[0].name,'run_it030_optimiser.star'),'');
  assert.equal((await continuationInputs(project,[],field,state,class2.id)).entries[0].name,'run_it025_optimiser.star');
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{query:'it001'})).entries.length,0);
  await fs.copyFile(path.join(project,jobs[0].name,'run_it025_optimiser.star'),path.join(project,jobs[0].name,'run_optimiser.star'));
  assert.equal((await continuationInputs(project,[],field,state,class2.id)).entries[0].name,'run_optimiser.star');
  assert.equal((await continuationInputs(project,[],field,state,class2.id,{job:jobs[0].name,iterationsOnly:true})).entries[0].name,'run_it025_optimiser.star');

 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Subset selection exotic browsing lists arbitrary STAR files and stays inside project',async()=>{
 const {exoticStarInputs}=await import('../lib/inputs.mjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'exotic-star-')),project=path.join(root,'project');
 try{
  await fs.mkdir(project);await fs.mkdir(path.join(project,'custom'));
  await fs.writeFile(path.join(project,'custom/alien.star'),'data_');
  await fs.writeFile(path.join(project,'custom/not-star.mrc'),'');
  await fs.symlink(root,path.join(project,'outside'));
  for(const key of ['fn_mic','fn_data']){
   const field={key,type:3,pattern:'STAR (*expected.star)',nodeType:'Expected'};
   const top=await exoticStarInputs(project,'Subset selection',field);
   assert.deepEqual(top.entries.map(e=>e.name),['custom']);
   const nested=await exoticStarInputs(project,'Subset selection',field,'custom');
   assert.deepEqual(nested.entries.map(e=>e.path),['custom/alien.star']);
   await assert.rejects(exoticStarInputs(project,'Subset selection',field,'..'),/outside/);
  }
  await assert.rejects(exoticStarInputs(project,'Import',{key:'fn_mic'}),/only available/);
  await assert.rejects(exoticStarInputs(project,'Subset selection',{key:'fn_model'}),/only available/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('STA optimisation chooser and defaults ignore Reconstruct particle placeholders',async()=>{
 const {sequentialDefaults}=await import('../lib/sequential-defaults.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'sta-inputs-'));
 try{
  const field={key:'in_optimisation',type:3,nodeType:'TomoOptimisationSet.star',nodeDepth:1,pattern:'STAR (*.star)',default:''};
  const jobs=[{name:'Extract/job009/',type:51,status:'Scheduled',outputs:['Extract/job009/optimisation_set.star']},{name:'Reconstruct/job010/',type:54,status:'Scheduled',outputs:['Reconstruct/job010/optimisation_set.star']}];
  for(const j of jobs){
   await fs.mkdir(path.join(project,j.name),{recursive:true});
   const marker=path.join(project,'.Nodes/TomoOptimisationSet',j.outputs[0]);
   await fs.mkdir(path.dirname(marker),{recursive:true});await fs.writeFile(marker,'');
  }
  const state={jobs,nodes:jobs.map(j=>({name:j.outputs[0],type:field.nodeType}))};
  assert.deepEqual((await compatibleInputs(project,[],field,state)).entries.map(e=>e.path),[jobs[0].outputs[0]]);
  const defaults=await sequentialDefaults(project,[],state,[{id:10,name:'3D auto-refine',fields:{}}],[{id:10,options:[field]}],10);
  assert.equal(defaults.in_optimisation,jobs[0].outputs[0]);
  await fs.rm(path.join(project,'.Nodes'),{recursive:true});
  assert.equal((await sequentialDefaults(project,[],state,[{id:10,name:'3D auto-refine',fields:{}}],[{id:10,options:[field]}],10)).in_optimisation,jobs[0].outputs[0]);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
