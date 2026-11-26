import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {inputReadiness} from '../lib/input-readiness.mjs';
import {preflight} from '../lib/preflight.mjs';
test('future optimiser is blocked for Run, allowed pending for Schedule, ready only with references',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'ready-'));
 try{
  const file='Class3D/job028/run_it025_optimiser.star';await fs.mkdir(path.join(project,'Class3D/job028'),{recursive:true});
  const adapter={call:async()=>({counter:29,jobs:[{name:'Class3D/job028/',status:'Running',outputs:[file]}]}),submit:async()=>({jobName:'Select/job029/',inputs:[]})};
  const args={project,adapter,layout:{name:'Subset selection'},schema:{options:[]},values:{fn_model:file}};
  assert.equal((await inputReadiness(project,[],file)).available,false);
  assert((await preflight({...args,action:'run'})).report.some(r=>r.severity==='error'));
  assert((await preflight({...args,action:'schedule'})).report.some(r=>r.severity==='pending'));
  await fs.writeFile(path.join(project,file),'');
  assert.equal((await inputReadiness(project,[],file)).available,false);
  await fs.writeFile(path.join(project,file),'data_optimiser_general\n_rlnModelStarFile Class3D/job028/run_it025_model.star\n_rlnExperimentalDataStarFile Class3D/job028/run_it025_data.star\n');
  assert.equal((await inputReadiness(project,[],file)).available,false);
  for(const name of ['model','data'])await fs.writeFile(path.join(project,'Class3D/job028/run_it025_'+name+'.star'),'data_test\n');
  assert.equal((await inputReadiness(project,[],file)).available,true);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
