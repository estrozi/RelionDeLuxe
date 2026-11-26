import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {subsetMethod,jobInfoEnricher} from '../lib/job-key-info.mjs';
test('Subset selection reports every requested modality and manual fallback',()=>{for(const [key,expected]of [['do_class_ranker','auto'],['do_dominant_3d','dominant'],['do_select_values','metad'],['do_discard','stats'],['do_split','split'],['do_remove_duplicates','dupli'],['do_filaments','filam']])assert.equal(subsetMethod({[key]:'Yes'}),expected);assert.equal(subsetMethod({do_discard:'No'}),'manual');assert.equal(subsetMethod({do_select_values:'Yes',do_split:'Yes'}),'metad · split');});
test('Subset mode remains a separate cached detail without replacing the particle count',async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'subset-info-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(path.join(root,'Select/job001'),{recursive:true});await fs.writeFile(path.join(root,'Select/job001/job.star'),'data_joboptions_values\nloop_\n_rlnJobOptionVariable #1\n_rlnJobOptionValue #2\ndo_class_ranker Yes\n');await fs.writeFile(path.join(root,'Select/job001/run.out'),'Saved particles.star with 125 selected particles.\n');const enrich=jobInfoEnricher(root,[{id:7,name:'Subset selection'}]);for(let i=0;i<2;i++){const result=await enrich({jobs:[{name:'Select/job001/',type:7,status:'Succeeded'}]});assert.equal(result.jobs[0].keyInfo,'125 particles');assert.equal(result.jobs[0].keyInfoDetail,'auto');}});

test('External-backed dominant selection is identified from its persisted marker across cached refreshes',async t=>{
 const {DominantAdapter}=await import('../lib/dominant-class.mjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-info-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const name='External/job002/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
 const raw={param1_label:'reliondeluxe_dominant_3d',param1_value:'Yes',param2_label:'saved_options',param2_value:Buffer.from(JSON.stringify({fn_model:'Class3D/job001/run_it025_optimiser.star',do_class_ranker:'No'})).toString('base64url')};
 await fs.writeFile(path.join(dir,'job.star'),'data_joboptions_values\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\n'+Object.entries(raw).map(([k,v])=>k+' '+v).join('\n')+'\n');
 await fs.writeFile(path.join(dir,'run.out'),'Selected 123 particles\n');
 const adapter=new DominantAdapter({call:async args=>args[0]==='job'?{type:99,values:raw}:{jobs:[{name,type:99,status:'Succeeded'}]}},root,[]);
 const enrich=jobInfoEnricher(root,[{id:7,name:'Subset selection'},{id:99,name:'External'}]);
 for(const command of ['state','refresh','state']){
  const result=await enrich(await adapter.call([command]));assert.equal(result.jobs[0].type,7);assert.equal(result.jobs[0].keyInfo,'123 particles');assert.equal(result.jobs[0].keyInfoDetail,'dominant');
 }
 assert.equal(subsetMethod({param1_label:'some_other_external_task'}),'manual');
});

test('dominant particle count comes from output STAR despite different stdout wording',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-count-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const name='External/job003/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'job.star'),'data_joboptions_values\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nparam1_label reliondeluxe_dominant_3d\n');
 await fs.writeFile(path.join(dir,'run.out'),'Dominant 3D class: 2; population 0.7.\nDone!\n');
 const output=path.join(dir,'particles.star');
 const star=n=>'data_optics\nloop_\n_rlnOpticsGroup\n_rlnImagePixelSize\n1 1.2\n2 1.2\n\ndata_particles\nloop_\n_rlnImageName\n_rlnClassNumber\n'+Array.from({length:n},(_,i)=>(i+1)+'@particles.mrcs 2').join('\n')+'\n';
 const enrich=jobInfoEnricher(root,[{id:7,name:'Subset selection'}]),state=()=>({jobs:[{name,type:7,status:'Succeeded'}]});
 await fs.writeFile(output,star(3));
 for(let i=0;i<2;i++){const job=(await enrich(state())).jobs[0];assert.equal(job.keyInfo,'3 particles');assert.equal(job.keyInfoDetail,'dominant');}
 await fs.writeFile(output,star(1));assert.equal((await enrich(state())).jobs[0].keyInfo,'1 particles');
 await fs.writeFile(output,star(0));assert.equal((await enrich(state())).jobs[0].keyInfo,'0 particles');
 await fs.unlink(output);assert.equal((await enrich(state())).jobs[0].keyInfoDetail,'dominant');
});
