import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {CryocareAdapter,encodeCryocare,decodeCryocare} from '../lib/cryocare.mjs';
import {NativeAdapter} from '../lib/native.mjs';
import {resolveResources} from '../public/template-resources.js';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url))).find(l=>l.id===58);
test('multi-GPU training encodes as native single GPU plus repeated CLI flags',()=>{
 const v={gpu_ids:'0, 2:3',do_cryocare_train:'Yes',other_args:'--example value'};
 const encoded=encodeCryocare(v);assert.equal(encoded.gpu_ids,'0');assert.equal(encoded.other_args,'--gpu 2 --gpu 3 --example value');assert.deepEqual(decodeCryocare(encoded),{...v,gpu_ids:'0,2,3'});assert.equal(v.gpu_ids,'0, 2:3');
 for(const ids of ['0,0','-1','0; echo bad','0,,1'])assert.throws(()=>encodeCryocare({...v,gpu_ids:ids}));
 assert.throws(()=>encodeCryocare({...v,do_cryocare_train:'No',do_cryocare_predict:'Yes'}),/training only/);
 assert.throws(()=>encodeCryocare({...v,other_args:'--gpu 7'}),/Additional arguments/);
});
test('cryoCARE training inherits all configured GPUs while prediction defaults to one',async()=>{
 const schema=JSON.parse(await fs.readFile(new URL('../public/catalog-tomo.json',import.meta.url))).find(s=>s.id===58),global={globalNgpus:'2',globalNcpus:'8',gpu_ids:'0:1'};
 assert.equal(resolveResources(layout,schema,{do_cryocare_train:'Yes'},global).gpu_ids,'0:1');assert.equal(resolveResources(layout,schema,{do_cryocare_train:'No',do_cryocare_predict:'Yes'},global).gpu_ids,'0');
});
test('native denoising preview, persisted settings and stock execution preserve both GPUs without MPI',{skip:!process.env.RELION_DELUXE_BRIDGE,timeout:25000},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'cryocare-native-'));
 try{
  const env={...process.env,RELIONDELUXE_MODE:'tomo',PATH:project+path.delimiter+process.env.PATH};
  const base=new NativeAdapter(project,path.resolve(process.env.RELION_DELUXE_BRIDGE),env),adapter=new CryocareAdapter(base);
  await base.call(['init']);const schema=(await adapter.call(['schema'])).find(s=>s.id===58);
  await fs.writeFile(path.join(project,'tomograms.star'),'data_global\n');
  await fs.writeFile(path.join(project,'relion_python_tomo_denoise'),'#!/bin/sh\nprintf "%s\\n" "$@" > gpu-argv.txt\nout=""\nwhile [ "$#" -gt 0 ]; do if [ "$1" = "--output-directory" ]; then shift; out="$1"; fi; shift; done\ntouch "${out}/RELION_JOB_EXIT_SUCCESS"\n',{mode:0o700});
  const values={in_tomoset:'tomograms.star',do_cryocare_train:'Yes',do_cryocare_predict:'No',tomograms_for_training:'tomo1',gpu_ids:'0,1',cryocare_path:'',do_queue:'No'};
  const preview=await adapter.submit('preview',layout,schema,values,'','');assert.match(preview.command,/--gpu 0/);assert.match(preview.command,/--gpu 1/);assert.doesNotMatch(preview.command,/mpirun|_mpi\b/);
  const scheduled=await adapter.submit('schedule',layout,schema,values,'','');const raw=await base.call(['job',scheduled.name]);assert.equal(raw.values.gpu_ids,'0');assert.equal(raw.values.other_args,'--gpu 1');assert.equal((await adapter.call(['job',scheduled.name])).values.gpu_ids,'0,1');
  // Run saved native settings with no RelionDeLuxe GPU translation at all.
  if(process.env.RELION_TEST_SCHEDULER)await promisify(execFile)(path.resolve(process.env.RELION_TEST_SCHEDULER),[scheduled.name],{cwd:project,env,timeout:20000});
  else await base.submit('run',layout,schema,raw.values,scheduled.name,'');
  for(let i=0;i<100;i++){if((await base.call(['refresh'])).jobs[0].status==='Succeeded')break;await new Promise(r=>setTimeout(r,20));}
  assert.equal((await base.call(['state'])).jobs[0].status,'Succeeded');const args=(await fs.readFile(path.join(project,'gpu-argv.txt'),'utf8')).trim().split('\n');assert.deepEqual(args.flatMap((a,i)=>a==='--gpu'?[args[i+1]]:[]),['0','1']);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
