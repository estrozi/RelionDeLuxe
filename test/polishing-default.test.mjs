import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
test('polishing parameter suggestion uses latest training output even when schema defaults to Train',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'polish-default-'));
 try{
  const layout=[{id:20,name:'Bayesian polishing',fields:{opt_params:{when:[{key:'do_polish',value:'Yes'}]}}}];
  const catalog=[{id:20,options:[{key:'do_polish',default:'No',type:5},{key:'opt_params',default:'',type:3,nodeType:'ParamsData.txt.relion.polish',nodeDepth:1,pattern:'TXT files (*.txt)'}]}];
  const jobs=[4,12].map(n=>({name:'Polish/job'+String(n).padStart(3,'0')+'/',status:'Succeeded',outputs:['Polish/job'+String(n).padStart(3,'0')+'/opt_params_all_groups.txt']}));
  const state={jobs,nodes:jobs.map(j=>({name:j.outputs[0],type:'ParamsData.txt.relion.polish'}))};
  const result=await sequentialDefaults(root,[],state,layout,catalog,20);
  assert.equal(result.opt_params,jobs[1].outputs[0]);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
