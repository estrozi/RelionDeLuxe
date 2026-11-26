import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {cryocareModelDefault} from '../lib/cryocare-training.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
test('denoising defaults select training models, including scheduled outputs, but never prediction jobs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'care-model-')),layout=[{id:58,name:'Denoise tomograms'}],state={jobs:[],nodes:[]};
 async function add(n,status,train,model=false){
  const name='Denoise/job'+String(n).padStart(3,'0')+'/';
  await fs.mkdir(path.join(root,name),{recursive:true});
  await fs.writeFile(path.join(root,name,'job.star'),"data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_cryocare_train "+(train?'Yes':'No')+"\ndo_cryocare_predict "+(train?'No':'Yes')+"\n");
  if(model)await fs.writeFile(path.join(root,name,'denoising_model.tar.gz'),'model');
  state.jobs.push({name,type:58,status,outputs:[]});
 }
 try{
  await add(1,'Succeeded',true,true);
  assert.equal(await cryocareModelDefault(root,[],state,layout),'Denoise/job001/denoising_model.tar.gz');
  await add(2,'Succeeded',true); // Missing completed model is not suggested.
  await add(3,'Failed',true,true);
  await add(4,'Scheduled',false);
  assert.equal(await cryocareModelDefault(root,[],state,layout),'Denoise/job001/denoising_model.tar.gz');
  await add(7,'Scheduled',true);
  assert.equal(await cryocareModelDefault(root,[],state,layout),'Denoise/job007/denoising_model.tar.gz');
  const catalog=[{id:58,options:[]}];
  assert.deepEqual(await sequentialDefaults(root,[],state,layout,catalog,58),{care_denoising_model:'Denoise/job007/denoising_model.tar.gz'});
  state.jobs.at(-1).status='Running';
  assert.equal(await cryocareModelDefault(root,[],state,layout),'Denoise/job007/denoising_model.tar.gz');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
