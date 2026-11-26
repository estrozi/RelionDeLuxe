import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {refinementThumbnail} from '../lib/refinement-thumbnail.mjs';
test('thumbnail selects latest readable numbered half-map and central Z slice',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'refine-thumb-')),job='Refine3D/job001/';
 try{
  await fs.mkdir(path.join(project,job),{recursive:true});
  const map=Buffer.alloc(1024+2*2*3*4);
  map.writeInt32LE(2,0);map.writeInt32LE(2,4);map.writeInt32LE(3,8);map.writeInt32LE(2,12);
  for(let i=0;i<12;i++)map.writeFloatLE(i,1024+i*4);
  await fs.writeFile(path.join(project,job,'run_it009_half1_class001.mrc'),map);
  await fs.writeFile(path.join(project,job,'run_it010_half1_class001.mrc'),'partial');
  let result=await refinementThumbnail(project,[],job);
  assert.equal(result.file,job+'run_it009_half1_class001.mrc');assert.deepEqual(result.pixels,[4,5,6,7]);
  assert.deepEqual((await refinementThumbnail(project,[],job,'X')).pixels,[1,3,5,7,9,11]);
  assert.deepEqual((await refinementThumbnail(project,[],job,'Y')).pixels,[2,3,6,7,10,11]);
  assert.deepEqual((await refinementThumbnail(project,[],job,'Z',0)).pixels,[0,1,2,3]);
  const last=await refinementThumbnail(project,[],job,'Z',1);
  assert.deepEqual(last.pixels,[8,9,10,11]);assert.equal(last.slice,2);assert.deepEqual(last.dimensions,[2,2,3]);
  assert.deepEqual((await refinementThumbnail(project,[],job,'X',0)).pixels,[0,2,4,6,8,10]);
  await assert.rejects(refinementThumbnail(project,[],job,'Z',2),/Invalid slice position/);
  await assert.rejects(refinementThumbnail(project,[],job,'W'),/Invalid slice axis/);
  await fs.writeFile(path.join(project,job,'run_it010_half1_class001.mrc'),map);
  result=await refinementThumbnail(project,[],job);assert.equal(result.file,job+'run_it010_half1_class001.mrc');
  await fs.rm(path.join(project,job),{recursive:true});await fs.mkdir(path.join(project,job));
  assert.equal((await refinementThumbnail(project,[],job)).file,null);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('classification previews keep classes together on latest complete iteration with shared slicing',async()=>{
 const {classificationThumbnails}=await import('../lib/refinement-thumbnail.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'class-thumbs-')),job='Class3D/job002/';
 try{
  await fs.mkdir(path.join(project,job),{recursive:true});
  const map=offset=>{const b=Buffer.alloc(1024+48);b.writeInt32LE(2,0);b.writeInt32LE(2,4);b.writeInt32LE(3,8);b.writeInt32LE(2,12);for(let i=0;i<12;i++)b.writeFloatLE(offset+i,1024+i*4);return b;};
  for(const id of [1,2])await fs.writeFile(path.join(project,job,'run_it009_class00'+id+'.mrc'),map(id*100));
  await fs.writeFile(path.join(project,job,'run_it010_class001.mrc'),map(1000));
  let result=await classificationThumbnails(project,[],job,'Z',1,2);
  assert.equal(result.iteration,9);assert.deepEqual(result.images.map(i=>i.classNumber),[1,2]);
  assert.deepEqual(result.images.map(i=>i.pixels[0]),[108,208]);
  await fs.writeFile(path.join(project,job,'run_it010_class002.mrc'),'incomplete');
  assert.equal((await classificationThumbnails(project,[],job,'Z',null,2)).iteration,9);
  await fs.writeFile(path.join(project,job,'run_it010_class002.mrc'),map(2000));
  result=await classificationThumbnails(project,[],job,'X',0,2);
  assert.equal((await classificationThumbnails(project,[],job,'Z',null,2,9)).iteration,9);
  assert.deepEqual((await classificationThumbnails(project,[],job,'Z',null,2,8)).images,[]);
  await assert.rejects(classificationThumbnails(project,[],job,'Z',null,2,-1),/Invalid iteration/);
  assert.equal(result.iteration,10);assert.deepEqual(result.images.map(i=>i.pixels[0]),[1000,2000]);
  assert.ok(result.images.every(i=>i.slice===0&&i.axis==='X'));
  assert.deepEqual((await classificationThumbnails(project,[],job,'Z',null,3)).images,[]);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('mask preview reads mask.mrc with shared axis and slice controls',async t=>{
 const {maskThumbnail}=await import('../lib/refinement-thumbnail.mjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mask-thumb-')),job='MaskCreate/job001/';t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,job),{recursive:true});
 assert.equal((await maskThumbnail(root,[],job)).file,null);
 const b=Buffer.alloc(1024+48);b.writeInt32LE(2,0);b.writeInt32LE(2,4);b.writeInt32LE(3,8);b.writeInt32LE(2,12);
 for(let i=0;i<12;i++)b.writeFloatLE(i/11,1024+4*i);
 await fs.writeFile(path.join(root,job,'mask.mrc'),b);
 const result=await maskThumbnail(root,[],job,'Z',1);assert.equal(result.file,job+'mask.mrc');assert.equal(result.mask,true);assert.equal(result.slice,2);assert.equal(result.pixels.at(-1),1);
 assert.equal((await maskThumbnail(root,[],job,'X',0)).slice,0);
 await assert.rejects(maskThumbnail(root,[],job,'W'),/Invalid slice axis/);
});

test('STA reconstruction preview prefers merged map and shares XYZ/slice controls',async t=>{
 const {reconstructionThumbnail}=await import('../lib/refinement-thumbnail.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'reconstruct-thumb-')),job='Reconstruct/job003/';t.after(()=>fs.rm(project,{recursive:true,force:true}));
 await fs.mkdir(path.join(project,job),{recursive:true});
 const map=Buffer.alloc(1024+48);map.writeInt32LE(2,0);map.writeInt32LE(2,4);map.writeInt32LE(3,8);map.writeInt32LE(2,12);for(let i=0;i<12;i++)map.writeFloatLE(i,1024+4*i);
 assert.equal((await reconstructionThumbnail(project,[],job)).file,null);
 await fs.writeFile(path.join(project,job,'half1.mrc'),map);assert.equal((await reconstructionThumbnail(project,[],job)).file,job+'half1.mrc');
 await fs.writeFile(path.join(project,job,'merged.mrc'),'partial');assert.equal((await reconstructionThumbnail(project,[],job)).file,job+'half1.mrc');
 await fs.writeFile(path.join(project,job,'merged.mrc'),map);assert.equal((await reconstructionThumbnail(project,[],job)).file,job+'merged.mrc');
 assert.deepEqual((await reconstructionThumbnail(project,[],job,'Z',1)).pixels,[8,9,10,11]);
 assert.deepEqual((await reconstructionThumbnail(project,[],job,'X',0)).pixels,[0,2,4,6,8,10]);
 await assert.rejects(reconstructionThumbnail(project,[],job,'Q'),/Invalid slice axis/);
});

test('initial reference uses one final model even when several classes were requested',async t=>{
 const {initialModelThumbnail}=await import('../lib/refinement-thumbnail.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'initial-thumb-')),job='InitialModel/job003/';t.after(()=>fs.rm(project,{recursive:true,force:true}));await fs.mkdir(path.join(project,job),{recursive:true});
 const map=Buffer.alloc(1024+48);map.writeInt32LE(2,0);map.writeInt32LE(2,4);map.writeInt32LE(3,8);map.writeInt32LE(2,12);for(let i=0;i<12;i++)map.writeFloatLE(i,1024+4*i);
 for(const n of [1,2])await fs.writeFile(path.join(project,job,`run_it010_class00${n}.mrc`),map);
 assert.equal((await initialModelThumbnail(project,[],job,'Z',null,2)).images.length,2);
 await fs.writeFile(path.join(project,job,'initial_model.mrc'),'partial');assert.equal((await initialModelThumbnail(project,[],job,'Z',null,2)).images.length,2);
 await fs.writeFile(path.join(project,job,'initial_model.mrc'),map);
 const final=await initialModelThumbnail(project,[],job,'Z',1,2);assert.equal(final.file,job+'initial_model.mrc');assert.equal(final.images,undefined);assert.deepEqual(final.pixels,[8,9,10,11]);
 assert.deepEqual((await initialModelThumbnail(project,[],job,'X',0,2)).pixels,[0,2,4,6,8,10]);
});
