import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {jobInfoEnricher} from '../lib/job-key-info.mjs';
test('raw import counts movie and micrograph STAR rows, refreshing after output changes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'import-count-'));
 try{
  for(const movies of [true,false]){
   const name='Import/job00'+(movies?1:2)+'/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
   await fs.mkdir(path.join(root,'Movies'),{recursive:true});const header=Buffer.alloc(1024);header.writeInt32LE(4096,0);header.writeInt32LE(3072,4);header.writeInt32LE(1,8);header.writeInt32LE(2,12);await fs.writeFile(path.join(root,'Movies','sample.mrc'),header);
   await fs.writeFile(path.join(dir,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_raw Yes\nfn_in_raw Movies/*.mrc\nis_multiframe '+(movies?'Yes':'No')+'\n');
   const output=path.join(dir,movies?'movies.star':'micrographs.star'),starHeader='data_images\nloop_\n_'+(movies?'rlnMicrographMovieName':'rlnMicrographName')+'\n';
   await fs.writeFile(output,starHeader+'a.tif\nb.tif\n');
   const enrich=jobInfoEnricher(root,[{id:0,name:'Import'}]),state=()=>({jobs:[{name,type:0,status:'Succeeded'}]});
   let job=(await enrich(state())).jobs[0];assert.equal(job.keyInfo,'2 files');assert.equal(job.keyInfoDetail,'4096×3072');
   await fs.writeFile(output,starHeader+'a.tif\nb.tif\nc.tif\n');
   job=(await enrich(state())).jobs[0];assert.equal(job.keyInfo,'3 files');assert.equal(job.keyInfoDetail,'4096×3072');
  }
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
