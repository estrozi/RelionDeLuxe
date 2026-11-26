import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {openMapPreview} from '../lib/map-preview.mjs';
test('Map preview validates MRC dimensions, modes, truncation and configured read roots',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'map-preview-'));
 try{
  const project=path.join(root,'project');await fs.mkdir(project);
  const map=Buffer.alloc(1024+8*4);for(const i of [0,4,8])map.writeInt32LE(2,i);map.writeInt32LE(2,12);
  await fs.writeFile(path.join(project,'valid.mrc'),map);
  const result=await openMapPreview(project,[],'valid.mrc');assert.equal(result.size,map.length);await result.handle.close();
  await fs.writeFile(path.join(root,'external.mrc'),map);
  await assert.rejects(openMapPreview(project,[],'../external.mrc'),/outside/);
  const external=await openMapPreview(project,[root],'../external.mrc');await external.handle.close();
  await fs.writeFile(path.join(project,'short.mrc'),map.subarray(0,1030));await assert.rejects(openMapPreview(project,[],'short.mrc'),/incomplete/);
  map.writeInt32LE(12,12);await fs.writeFile(path.join(project,'half.mrc'),map);await assert.rejects(openMapPreview(project,[],'half.mrc'),/Unsupported/);
  map.writeInt32LE(2,12);map.writeInt32LE(999999,0);await fs.writeFile(path.join(project,'huge.mrc'),map);await assert.rejects(openMapPreview(project,[],'huge.mrc'),/Unsupported/);
  await fs.writeFile(path.join(project,'secret.txt'),map);await assert.rejects(openMapPreview(project,[],'secret.txt'),/supports/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('Authenticated map endpoint streams the complete volume bytes',async()=>{
 const {spawn}=await import('node:child_process');const {once}=await import('node:events');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'map-http-'));let child;
 try{
  const map=Buffer.alloc(1056);for(const offset of [0,4,8])map.writeInt32LE(2,offset);map.writeInt32LE(2,12);await fs.writeFile(path.join(project,'map.mrc'),map);
  child=spawn(process.execPath,['server.mjs','--demo','--project',project,'--port','23454'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
  let output='';const token=await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',code=>reject(Error('Server exited '+code)));});
  const moduleResponse=await fetch('http://127.0.0.1:23454/convergence.js');assert.equal(moduleResponse.status,200);assert.match(moduleResponse.headers.get('content-type'),/^text\/javascript/);assert.match(await moduleResponse.text(),/export function drawConvergence/);
  const url='http://127.0.0.1:23454/api/map-preview?file=map.mrc';assert.equal((await fetch(url)).status,401);
  const response=await fetch(url,{headers:{'X-Relion-Token':token}});assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),map);
  const cif='data_model\n# atomic coordinates\n';await fs.writeFile(path.join(project,'model.cif'),cif);
  const cifURL='http://127.0.0.1:23454/api/map-download?file=model.cif';
  assert.equal((await fetch(cifURL)).status,401);
  const cifResponse=await fetch(cifURL,{headers:{'X-Relion-Token':token}});
  assert.equal(cifResponse.status,200);assert.match(cifResponse.headers.get('content-disposition'),/model.cif/);assert.equal(await cifResponse.text(),cif);
  for(const [value,expected] of [['model.cif',true],['missing.star',false],['*.mrc',null]]){const check=await fetch('http://127.0.0.1:23454/api/check-input-path?'+new URLSearchParams({value}),{headers:{'X-Relion-Token':token}});assert.equal((await check.json()).valid,expected);}
  const download='http://127.0.0.1:23454/api/map-download?file=map.mrc';
  assert.equal((await fetch(download)).status,401);
  const saved=await fetch(download,{headers:{'X-Relion-Token':token}});
  assert.equal(saved.status,200);assert.match(saved.headers.get('content-disposition'),/attachment/);assert.deepEqual(Buffer.from(await saved.arrayBuffer()),map);
  const outside=await fetch('http://127.0.0.1:23454/api/map-download?file=../outside.mrc',{headers:{'X-Relion-Token':token}});assert.notEqual(outside.status,200);
  for(const route of ['map-viewer.html','map-viewer.js','map-viewer.css','map-links.js'])assert.equal((await fetch('http://127.0.0.1:23454/'+route)).status,200);

 }finally{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}await fs.rm(project,{recursive:true,force:true});}
});

test('mask threshold identification uses registered mask nodes and Mask creation outputs, including aliases',async()=>{
 const {isMaskPreview}=await import('../lib/map-preview.mjs');
 const state={jobs:[{name:'MaskCreate/job012/',alias:'MaskCreate/soft/',type:12,outputs:['MaskCreate/job012/mask.mrc']}],nodes:[{name:'Import/job003/imported.mrc',type:'Mask3D.mrc'}]},layout=[{id:12,name:'Mask creation'}];
 for(const file of ['MaskCreate/job012/mask.mrc','MaskCreate/soft/mask.mrc','/project/MaskCreate/job012/mask.mrc','Import/job003/imported.mrc'])assert.equal(isMaskPreview('/project',file,state,layout),true);
 for(const file of ['Refine3D/job002/map.mrc','MaskCreate/job012/input.mrc','mask.mrc'])assert.equal(isMaskPreview('/project',file,state,layout),false);
});
