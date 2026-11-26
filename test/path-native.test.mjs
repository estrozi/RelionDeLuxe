import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
import {commandExecutables,resolveExecutable,checkCommands} from '../lib/executables.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
test('Command inspection finds native executables without executing shell text',()=>{
 assert.deepEqual(commandExecutables(['`which relion_refine_mpi` --i particles.star','relion_import --i Movies/*.tif']),['which','relion_refine_mpi','relion_import']);
});
test('Native Import and Class2D invoke PATH binaries; missing executable does not register a job',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-path-'));const bin=path.join(project,'bin');await fs.mkdir(bin);
 // Instrumented executable fixtures, NOT reconstruction binaries. They prove
 // PATH resolution, cwd, argv and RELION lifecycle integration independently.
 const script='#!/bin/sh\necho "$0 $@"\nout=""\nwhile [ "$#" -gt 0 ]; do case "$1" in --o|--odir|--pipeline_control) out="$2"; shift;; esac; shift; done\nmkdir -p "$out"\ntouch "${out}/movies.star" "${out}/RELION_JOB_EXIT_SUCCESS"\n';
 for(const name of ['relion_import','relion_refine'])await fs.writeFile(path.join(bin,name),script,{mode:0o700});
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH};const a=new NativeAdapter(project,path.resolve(bridge),env);
 try{
  await a.call(['init']);const schema=await a.call(['schema']);
  for(const [name,values,executable]of [['Import',{fn_in_raw:'Movies/*.tiff'},'relion_import'],['2D classification',{fn_img:'particles.star',nr_mpi:'1',do_queue:'No'},'relion_refine']]){
   const l=layout.find(x=>x.name===name),s=schema.find(x=>x.id===l.id);const preview=await a.submit('preview',l,s,values,'','');assert.ok(preview.checks.some(x=>x.name===executable&&x.path===path.join(bin,executable)));
   const result=await a.submit('run',l,s,values,'','');for(let i=0;i<30;i++){if((await a.call(['refresh'])).jobs.find(j=>j.name===result.name).status==='Succeeded')break;await new Promise(r=>setTimeout(r,50));}
   assert.equal((await a.call(['refresh'])).jobs.find(j=>j.name===result.name).status,'Succeeded');
   assert.match(await fs.readFile(path.join(project,result.name,'run.out'),'utf8'),new RegExp(executable));
  }
  const ext=layout.find(x=>x.name==='External'),s=schema.find(x=>x.id===ext.id);const count=(await a.call(['state'])).jobs.length;
  await assert.rejects(a.submit('run',ext,s,{fn_exe:'missing_deluxe_test_binary'},'',''),/not found in server PATH/);assert.equal((await a.call(['state'])).jobs.length,count);
  assert.equal(await resolveExecutable('relion_import',{cwd:project,env}),path.join(bin,'relion_import'));
  const queue=await checkCommands({commands:['`which missing_deluxe_queue_worker_binary` --i a.star']},{do_queue:'Yes',qsub:'sh'},{cwd:project,env});assert.deepEqual(queue.missing,[]);assert.equal(queue.checks.find(x=>x.name==='missing_deluxe_queue_worker_binary').required,false);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
