import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {MaskRescaleAdapter,maskRescaleLayout,maskRescaleSchema,mrcGrid,matchingGrid} from '../lib/mask-rescale.mjs';
import {nextJobInputs,suggestedNextJob} from '../public/workspace-feed.js';

const header=(n,pixel)=>{const b=Buffer.alloc(1024);for(let axis=0;axis<3;axis++){b.writeInt32LE(n,axis*4);b.writeInt32LE(n,28+axis*4);b.writeFloatLE(n*pixel,40+axis*4);}b.writeInt32LE(2,12);b.write('MAP ',208);b[212]=68;b[213]=65;return b;};
test('mask grid reads MRC pixel size and checks both pixel and box dimensions',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mask-grid-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.writeFile(path.join(dir,'map.mrc'),header(64,1.5));await fs.writeFile(path.join(dir,'mask.mrc'),header(32,3));
 const map=await mrcGrid(dir,[],'map.mrc'),mask=await mrcGrid(dir,[],'mask.mrc');
 assert.equal(map.pixelSize,1.5);assert.deepEqual(map.size,[64,64,64]);assert.equal(matchingGrid(map,mask),false);
 assert.equal(matchingGrid(map,{...mask,size:map.size,pixelSize:1.5}),true);
});
test('External runner copies matching mask and registers an ordinary mask output',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mask-runner-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'External/job001'),{recursive:true});await fs.writeFile(path.join(dir,'map.mrc'),header(32,2));await fs.writeFile(path.join(dir,'mask.mrc'),header(32,2));
 const script=new URL('../scripts/mask-rescale-runner.mjs',import.meta.url);
 const result=spawnSync(process.execPath,[script.pathname,'--o','External/job001/','--in_3dref','map.mrc','--in_mask','mask.mrc','--read_roots',Buffer.from('[]').toString('base64url')],{cwd:dir,encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.deepEqual(await fs.readFile(path.join(dir,'External/job001/rescaled_mask.mrc')),header(32,2));
 assert.match(await fs.readFile(path.join(dir,'External/job001/RELION_OUTPUT_NODES.star'),'utf8'),/rescaled_mask\.mrc' Mask3D\.mrc/);
 assert(await fs.stat(path.join(dir,'External/job001/RELION_JOB_EXIT_SUCCESS')));
});
test('External runner invokes relion_image_handler for a different pixel size',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mask-convert-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'External/job001'),{recursive:true});await fs.mkdir(path.join(dir,'bin'));
 await fs.writeFile(path.join(dir,'map.mrc'),header(64,1.5));await fs.writeFile(path.join(dir,'mask.mrc'),header(32,3));
 const fake=path.join(dir,'bin/relion_image_handler');await fs.writeFile(fake,'#!/bin/sh\nprintf "%s\\n" "$@" > command-args\nwhile [ "$1" != "--o" ]; do shift; done\ncp map.mrc "$2"\n',{mode:0o755});
 const script=new URL('../scripts/mask-rescale-runner.mjs',import.meta.url);
 const result=spawnSync(process.execPath,[script.pathname,'--o','External/job001/','--in_3dref','map.mrc','--in_mask','mask.mrc','--read_roots',Buffer.from('[]').toString('base64url')],{cwd:dir,encoding:'utf8',env:{...process.env,PATH:path.join(dir,'bin')+':'+process.env.PATH}});
 assert.equal(result.status,0,result.stderr);const command=await fs.readFile(path.join(dir,'command-args'),'utf8');
 assert.match(command,/--angpix\n3\n/);assert.match(command,/--rescale_angpix\n1\.5\n/);assert.match(command,/--new_box\n64\n/);assert.match(command,/--force_header_angpix\n1\.5\n/);assert.match(command,/--threshold_above\n1\n/);assert.match(command,/--threshold_below\n0\n/);
 assert.equal((await mrcGrid(dir,[],'External/job001/rescaled_mask.mrc')).pixelSize,1.5);
});
test('Mask re-scaling maps to RELION External while preserving the user-facing fields',async()=>{
 const raw={type:99,values:{in_3dref:'map.mrc',in_mask:'mask.mrc',param1_label:'reliondeluxe_mask_rescale'}};
 const ext={id:99,options:[]},submitted=[];
 const base={call:async([action])=>action==='schema'?[ext]:action==='job'?raw:{jobs:[{name:'External/job001/',type:99}]},submit:async(...args)=>{submitted.push(args);return {inputs:[]};}};
 const adapter=new MaskRescaleAdapter(base,'/project',[]);
 assert((await adapter.call(['schema'])).includes(maskRescaleSchema));
 assert.deepEqual((await adapter.call(['job','External/job001/'])).values,{map:'map.mrc',mask:'mask.mrc'});
 assert.equal((await adapter.call(['state'])).jobs[0].type,1003);
 const result=await adapter.submit('preview',maskRescaleLayout,maskRescaleSchema,{map:'map.mrc',mask:'mask.mrc'},'','');
 assert.equal(submitted[0][1].label,'relion.external');assert.equal(submitted[0][3].in_mask,'mask.mrc');assert.equal(result.inputs.length,2);
});
test('server exposes the separate Mask re-scaling editor and leaves Post-processing intact',async()=>{
 const child=spawn(process.execPath,['server.mjs','--demo','--port','23460'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{const match=chunk.toString().match(/#token=([a-f0-9]+)/);if(match)resolve(match[1]);});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  const response=await fetch('http://127.0.0.1:23460/api/config',{headers:{'X-Relion-Token':token}});assert.equal(response.status,200);
  const config=await response.json(),job=config.layout.find(l=>l.name==='Mask re-scaling'),post=config.layout.find(l=>l.name==='Post-processing');
  assert.deepEqual(job.tabs['I/O'],['map','mask']);assert.equal(config.catalog.find(s=>s.id===job.id).options.length,2);
  assert(!post.tabs['I/O'].includes('resize_mask'));
 }finally{if(child.exitCode===null){child.kill();await once(child,'exit');}}
});
test('completed mask output seeds a normal Post-processing job',()=>{
 const source={type:1003,outputs:['External/job001/rescaled_mask.mrc']},layout=[maskRescaleLayout,{id:15,name:'Post-processing'}];
 assert.equal(suggestedNextJob(source,{},layout).name,'Post-processing');
 assert.deepEqual(nextJobInputs(source,layout[1],[],layout),{fn_mask:'External/job001/rescaled_mask.mrc'});
});
