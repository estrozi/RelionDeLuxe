import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
import {workstationDefaults} from '../public/workstation-defaults.js';
test('Import defaults use actual extension spelling, including older screening reports',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'import-default-'));
 try{
  await fs.mkdir(path.join(root,'External/job001'),{recursive:true});await fs.mkdir(path.join(root,'Movies'));
  const report=path.join(root,'External/job001/screening-copy.json');
  await fs.writeFile(report,JSON.stringify({folder:'Movies',frames:20,extensions:['.tiff']}));
  await fs.writeFile(path.join(root,'Movies/movie.tiff'),'');
  const state={jobs:[{type:1002,status:'Succeeded',name:'External/job001/'}],nodes:[]},layout=[{id:0,name:'Import'}];
  assert.equal((await sequentialDefaults(root,[],state,layout,[],0)).fn_in_raw,'Movies/*.tiff');
  await fs.writeFile(report,JSON.stringify({folder:'Movies',frames:20,extensions:['.TIFF'],extensionCasePreserved:true}));
  assert.equal((await sequentialDefaults(root,[],state,layout,[],0)).fn_in_raw,'Movies/*.tiff','actual files override a stale report');
  await fs.rename(path.join(root,'Movies/movie.tiff'),path.join(root,'Movies/movie.TIFF'));
  assert.equal((await sequentialDefaults(root,[],state,layout,[],0)).fn_in_raw,'Movies/*.TIFF');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('switching gradient resources gives one MPI process and all project CPUs as threads',()=>{
 const schema={options:[{key:'nr_mpi',default:'4'},{key:'nr_threads',default:'2'},{key:'do_grad',default:'No'}]};
 const result=workstationDefaults({name:'2D classification'},schema,{do_grad:'Yes'},{globalNcpus:'24',globalNgpus:'3'});
 assert.equal(result.nr_mpi,'1');assert.equal(result.nr_threads,'24');
});
