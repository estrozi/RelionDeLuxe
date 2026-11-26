import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {attachTopazModels,topazModelInputs} from '../lib/topaz-models.mjs';
import {nextJobInputs} from '../public/workspace-feed.js';
test('training outputs, chooser and next draft use highest numeric epoch',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'topaz-model-'));
 try{
 const name='AutoPick/job009/';await fs.mkdir(path.join(project,name),{recursive:true});
 await fs.writeFile(path.join(project,name,'job.star'),`data_joboptions_values\nloop_\n_rlnJobOptionVariable #1\n_rlnJobOptionValue #2\ndo_topaz Yes\ndo_topaz_train Yes\nfn_input_autopick CtfFind/job003/micrographs_ctf.star\n`);
 for(const epoch of [2,9,10])await fs.writeFile(path.join(project,name,`model_epoch${epoch}.sav`),'weights');
 const job={name,type:4,status:'Succeeded',outputs:[name+'input_training_coords.star']};const state={jobs:[job],nodes:[]};
 await attachTopazModels(project,[],state);assert.deepEqual(job.outputs,[name+'model_epoch10.sav']);
 const found=await topazModelInputs(project,[],state);assert.deepEqual(found.entries.map(e=>e.path),job.outputs);
 const draft=nextJobInputs(job,{name:'Auto-picking'});assert.equal(draft.do_topaz_train,'No');assert.equal(draft.do_topaz_pick,'Yes');assert.equal(draft.topaz_model,job.outputs[0]);assert.equal(draft.fn_input_autopick,'CtfFind/job003/micrographs_ctf.star');
 job.status='Running';assert.equal((await topazModelInputs(project,[],state)).entries.length,0);
 await fs.writeFile(path.join(project,name,'model_epoch11.sav'),'');await attachTopazModels(project,[],state);assert.equal(job.topazModel,'');assert.deepEqual(job.outputs,[]);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
