import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';

for(const [type,name,folder] of [[0,'Import','Import'],[50,'Import tilt series','Import']])test(name+' inherits only a valid pixel size from a completed raw Import',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'import-angpix-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const state={jobs:[],nodes:[]},layout=[{id:type,name}];
 const defaults=()=>sequentialDefaults(project,[],state,layout,[],type);
 assert.equal((await defaults()).angpix,undefined);
 async function add(n,pixel,status='Succeeded',raw='Yes'){
  const job={name:`${folder}/job${String(n).padStart(3,'0')}/`,type,status};state.jobs.push(job);
  await fs.mkdir(path.join(project,job.name),{recursive:true});
  await fs.writeFile(path.join(project,job.name,'job.star'),`data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nangpix '${pixel}'\ndo_raw '${raw}'\n`);return job;
 }
 const first=await add(1,'1.57','Scheduled');assert.equal((await defaults()).angpix,undefined);
 first.status='Succeeded';assert.equal((await defaults()).angpix,'1.57');
 await add(2,'0.885','Failed');await add(3,'-1');await add(4,'2.5','Succeeded','No');
 assert.equal((await defaults()).angpix,'1.57');
 await add(5,'2.34');assert.equal((await defaults()).angpix,'2.34');
});

test('new Import defaults suppress numeric schema and saved defaults until previous-job detection',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function newDefaults('),source.indexOf('function applyWorkstation('));
 for(const name of ['Import','Import tilt series']){
  const ctx={config:{layout:[{id:0,name,overrides:{angpix:'0.885'}}],catalog:[{id:0,options:[{key:'angpix',default:'1'}]}]},savedJobDefaults:new Map([[0,{angpix:'3'}]]),alignmentCpuDefault(){},workstationDefaults:()=>({}),classSelectionDefaults:(_l,_s,v)=>v};
  vm.createContext(ctx);vm.runInContext(code,ctx);assert.equal(ctx.newDefaults(0).angpix,'');
 }
});
