import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {preflight} from '../lib/preflight.mjs';
test('continuation accepts completed later producer but retains missing-file and unfinished-producer warnings',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'continue-order-'));
 try{
  const file='MaskCreate/job034/mask.mrc';
  await fs.mkdir(path.dirname(path.join(project,file)),{recursive:true});
  await fs.writeFile(path.join(project,file),'map');
  const producer={name:'MaskCreate/job034/',status:'Succeeded',outputs:[file]};
  const adapter={call:async()=>({counter:35,jobs:[producer]}),submit:async()=>({inputs:[{name:file,type:'Mask3D'}]})};
  const args={project,adapter,layout:{name:'3D auto-refine'},schema:{options:[]},values:{},existing:'Refine3D/job033/',action:'continue'};
  assert(!(await preflight(args)).report.some(r=>r.message.includes('later than')));
  for(const status of ['Scheduled','Running','Failed','Aborted']){
   producer.status=status;
   assert((await preflight(args)).report.some(r=>r.message.includes('later than')),status);
  }
  producer.status='Succeeded';await fs.unlink(path.join(project,file));
  const report=(await preflight(args)).report;
  assert(report.some(r=>r.severity==='warning'&&r.message.includes('does not exist')));
  assert(!report.some(r=>r.message.includes('later than')));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
