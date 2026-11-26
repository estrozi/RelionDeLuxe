import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
import {inputField,validInputProducer,matchesInputFile} from '../lib/inputs.mjs';
import {nextJobInputs} from '../public/workspace-feed.js';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url)));
const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog-tomo.json',import.meta.url)));
test('exclude defaults ignore newer reconstructed tomograms including pending outputs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'exclude-default-'));
 try{
  const field=inputField(catalog,57,'in_tiltseries'),group=field.nodeType.split('.').slice(0,field.nodeDepth).join('.');
  const jobs=[{name:'CtfFind/job003/',type:2,status:'Scheduled',outputs:['CtfFind/job003/tilt_series_ctf.star']},{name:'ReconstructTomograms/job006/',type:56,status:'Scheduled',outputs:['ReconstructTomograms/job006/tomograms.star']}];
  const state={jobs,nodes:jobs.flatMap(j=>j.outputs.map(name=>({name,type:group+'.star.relion'})))};
  assert.equal((await sequentialDefaults(root,[],state,layout,catalog,57)).in_tiltseries,jobs[0].outputs[0]);
  state.jobs=jobs.slice(1);assert.equal((await sequentialDefaults(root,[],state,layout,catalog,57)).in_tiltseries,'');
  for(const type of [50,1,2,55,57])assert(validInputProducer(field,{type}));
  assert(!validInputProducer(field,{type:56}));
  assert(!matchesInputFile('tomograms.star',field));
  assert(matchesInputFile('corrected_tilt_series.star',field));
  assert.deepEqual(nextJobInputs(jobs[1],{name:'Exclude tilt-images'}),{});
  assert.deepEqual(nextJobInputs(jobs[0],{name:'Exclude tilt-images'}),{in_tiltseries:jobs[0].outputs[0]});
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
