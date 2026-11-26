import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {jobInfoEnricher} from '../lib/job-key-info.mjs';
import {nextJobInputs} from '../public/workspace-feed.js';
test('CTF summary reads finite DefocusU range in microns and next subset receives micrographs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ctf-info-'));
 try{
  const name='CtfFind/job003/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(path.join(dir,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nuse_given_ps No\n');
  const file=path.join(dir,'micrographs_ctf.star');
  await fs.writeFile(file,'data_micrographs\nloop_\n_rlnDefocusU\n13100\nnan\n8300\ninf\n');
  const state=()=>({jobs:[{name,type:3,status:'Succeeded'}]}),enrich=jobInfoEnricher(root,[{id:3,name:'CTF estimation'}]);
  assert.equal((await enrich(state())).jobs[0].keyInfo,'0.8μm-1.3μm');
  await fs.writeFile(file,'data_micrographs\nloop_\n_rlnDefocusU\n20000\n40000\n');
  assert.equal((await enrich(state())).jobs[0].keyInfo,'2μm-4μm');
  assert.deepEqual(nextJobInputs({outputs:[name+'micrographs_ctf.star']},{name:'Subset selection'}),{fn_model:'',fn_mic:name+'micrographs_ctf.star',fn_data:''});
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
