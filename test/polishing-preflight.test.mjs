import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {preflight} from '../lib/preflight.mjs';
import {NativeAdapter} from '../lib/native.mjs';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))).find(l=>l.name==='Bayesian polishing');
const schema=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url))).find(s=>s.id===layout.id);
const micSchema={options:schema.options.filter(f=>f.key==='fn_mic')};

test('Polishing validates fn_mic even when RELION omits it from preview inputs',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'polish-check-'));
 try {
  await fs.writeFile(path.join(project,'micrographs_ctf.star'),'placeholder');
  let labels=['rlnMicrographName'];
  const adapter={submit:async()=>({jobName:'Polish/job003/',inputs:[]}),call:async([cmd,,block])=>cmd==='state'?{jobs:[],counter:3}:block==='optics'?{rows:0,labels:[]}:{rows:1,labels}};
  const args={project,adapter,layout,schema:micSchema,values:{fn_mic:'micrographs_ctf.star'}};
  for(const action of ['run','schedule','scheduler']) {
   const {report}=await preflight({...args,action});
   assert(report.some(r=>r.severity==='warning'&&r.field==='fn_mic'&&r.file==='micrographs_ctf.star'&&r.message.includes('_rlnMicrographMetadata')&&r.message.includes('Motion correction')));
  }
  labels.push('rlnMicrographMetadata');
  assert(!(await preflight(args)).report.some(r=>r.severity==='warning'));
  await fs.unlink(path.join(project,'micrographs_ctf.star'));
  assert((await preflight(args)).report.some(r=>r.message.includes('does not exist')));
  adapter.call=async()=>({jobs:[{name:'MotionCorr/job001/',status:'Scheduled',outputs:['MotionCorr/job001/corrected_micrographs.star']}],counter:3});
  const result=await preflight({...args,action:'schedule',values:{fn_mic:'MotionCorr/job001/corrected_micrographs.star'}});
  assert.deepEqual(result.report.map(r=>r.severity),['pending']);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Native STAR parser detects missing polishing metadata',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'polish-native-'));
 try {
  const native=new NativeAdapter(project,path.resolve(process.env.RELION_DELUXE_BRIDGE));
  const file=path.join(project,'micrographs_ctf.star');
  await fs.writeFile(file,'data_micrographs\nloop_\n_rlnMicrographName #1\nmic.mrc\n');
  const adapter={submit:async()=>({jobName:'Polish/job003/',inputs:[]}),call:args=>args[0]==='state'?Promise.resolve({jobs:[],counter:3}):native.call(args)};
  const args={project,adapter,layout,schema:micSchema,values:{fn_mic:'micrographs_ctf.star'}};
  assert((await preflight(args)).report.some(r=>r.message.includes('_rlnMicrographMetadata')));
  await fs.writeFile(file,'data_micrographs\nloop_\n_rlnMicrographName #1\n_rlnMicrographMetadata #2\nmic.mrc movie.star\n');
  assert(!(await preflight(args)).report.some(r=>r.message.includes('is missing: _rlnMicrographMetadata')));
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
