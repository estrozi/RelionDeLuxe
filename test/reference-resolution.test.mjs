import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolutionInfo,jobInfoEnricher} from '../lib/job-key-info.mjs';
import {referenceResolution} from '../public/input-sort.js';
test('resolution follows the last valid reported iteration and retains auto-refine summary',()=>{
 const log='CurrentResolution= 12 Angstroms\nCurrentResolution= 7.30839 Angstroms, which requires orientationSampling of at least 3.91304 degrees for a particle of diameter 212.4 Angstroms\nCurrentResolution= nan Angstroms\nCurrentResolution= 999 Angstroms';
 for(const type of ['3D initial reference','3D classification'])assert.equal(resolutionInfo(type,log),'7.31 Å');
 assert.equal(resolutionInfo('3D classification','CurrentResolution= inf Angstroms'),'');
 assert.equal(resolutionInfo('3D auto-refine','Auto-refine: + Final resolution (without masking) is: 3.12'),'3.12 Å');
});
test('finished job enrichment preserves first line and caches resolution details',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'resolution-info-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const layout=[{id:1,name:'3D initial reference'},{id:2,name:'3D classification'}];
 for(const type of [1,2]){
  const name=`Class3D/job00${type}/`,dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nsym_name D2\nnr_classes 3\n');
  await fs.writeFile(path.join(dir,'run.out'),'CurrentResolution= 7.30839 Angstroms\n');
  const enrich=jobInfoEnricher(root,layout),state=()=>({jobs:[{name,type,status:'Succeeded'}]});
  for(let i=0;i<2;i++){
   const job=(await enrich(state())).jobs[0];assert.equal(job.keyInfo,type===1?'D2':'3 classes');assert.equal(job.keyInfoDetail,'7.31 Å');assert.equal(job.resolutionInfo,'7.31 Å');
  }
  await fs.appendFile(path.join(dir,'run.out'),'CurrentResolution= 6.2 Angstroms\n');assert.equal((await enrich(state())).jobs[0].keyInfoDetail,'6.2 Å');
 }
});
test('reference badges resolve real names, aliases and absolute project paths without guessing',()=>{
 const jobs=[{name:'Class3D/job012/',alias:'Class3D/good/',resolutionInfo:'7.31 Å'}];
 for(const file of ['Class3D/job012/run_class001.mrc','./Class3D/good/run_class001.mrc','/project/Class3D/job012/run_class001.mrc'])assert.equal(referenceResolution(file,jobs,'/project').text,'7.31 Å');
 for(const file of ['Class3D/job013/map.mrc','/elsewhere/Class3D/job012/map.mrc',''])assert.equal(referenceResolution(file,jobs,'/project'),null);
});

test('dominant map inherits classification resolution independent of job order and cached refreshes',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-resolution-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source='Class3D/job001/',selected='External/job002/';
 for(const name of [source,selected])await fs.mkdir(path.join(root,name),{recursive:true});
 await fs.writeFile(path.join(root,source,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nnr_classes 3\n');
 await fs.writeFile(path.join(root,source,'run.out'),'CurrentResolution= 7.30839 Angstroms\n');
 const output=selected+'run_it025_dominantclass.mrc';
 const layout=[{id:9,name:'3D classification'},{id:7,name:'Subset selection'}];
 const state=()=>({jobs:[{name:selected,type:7,status:'Succeeded',outputs:[output]},{name:source,alias:'Class3D/classes/',type:9,status:'Succeeded'}]});
 const enrich=jobInfoEnricher(root,layout);
 for(const ref of [source+'run_it025_optimiser.star','Class3D/classes/run_it025_optimiser.star',path.join(root,source,'run_it025_optimiser.star')]){
  await fs.writeFile(path.join(root,selected,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nparam1_label reliondeluxe_dominant_3d\nin_part '+ref+'\n');
  for(let i=0;i<2;i++){
   const result=await enrich(state()),job=result.jobs[0];assert.equal(job.resolutionInfo,'7.31 Å');assert.equal(job.resolutionAngstrom,7.30839);assert.equal(job.keyInfoDetail,'dominant · 7.31 Å');
   const badge=referenceResolution(output,result.jobs,root);assert.equal(badge.text,'7.31 Å');assert.equal(badge.value,7.30839);assert.match(badge.title,/Class3D\/job001/);
  }
 }
 await fs.appendFile(path.join(root,source,'run.out'),'CurrentResolution= 6.5 Angstroms\n');assert.equal((await enrich(state())).jobs[0].resolutionInfo,'6.5 Å');
 const orphan=state();orphan.jobs.pop();assert.equal((await enrich(orphan)).jobs[0].resolutionInfo,undefined);
});
