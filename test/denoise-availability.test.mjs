import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {denoiseAvailability,denoiseSplitReason} from '../lib/denoise-availability.mjs';
test('denoising requires at least one eligible motion job with saved split images',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'denoise-availability-')),layout=[{id:51,name:'Motion correction'}],state={jobs:[]};
 const check=()=>denoiseAvailability(project,[],state,layout);
 try{
  assert.equal(await check(),denoiseSplitReason);
  const name='MotionCorr/job002/';await fs.mkdir(path.join(project,name),{recursive:true});
  const write=async value=>fs.writeFile(path.join(project,name,'job.star'),'data_\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_even_odd_split '+value+'\n');
  state.jobs.push({name,type:51,status:'Scheduled'});await write('No');assert.equal(await check(),denoiseSplitReason);
  await write('Yes');
  for(const status of ['Scheduled','Running','Succeeded']){state.jobs[0].status=status;assert.equal(await check(),'');}
  for(const status of ['Failed','Aborted','Draft']){state.jobs[0].status=status;assert.equal(await check(),denoiseSplitReason);}
  state.jobs[0].status='Scheduled';state.jobs.push({name:'MotionCorr/job003/',type:51,status:'Scheduled'});assert.equal(await check(),'');
  state.jobs.shift();assert.equal(await check(),denoiseSplitReason);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
