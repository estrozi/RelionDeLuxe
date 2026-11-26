import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {tomogramDisplaySize,tomogramColumns,supportCenterSlice} from '../public/tomo-view.js';
import {galleryImage} from '../lib/gallery.mjs';
test('single tomogram fit modes preserve aspect and allow overflow on the other axis',()=>{
 assert.deepEqual(tomogramDisplaySize(1200,800,600,300,'native'),{width:1200,height:800,scale:1});
 assert.deepEqual(tomogramDisplaySize(1200,800,600,300,'width'),{width:600,height:400,scale:.5});
 assert.deepEqual(tomogramDisplaySize(1200,800,600,300,'height'),{width:450,height:300,scale:.375});
 assert.equal(tomogramDisplaySize(800,200,500,300,'height').width,1200);
 assert.equal(tomogramDisplaySize(1200,800,900,300,'width').width,900);
 assert.ok(!tomogramColumns.includes('rlnReferenceImage'));
});
test('full resolution plane retains actual pixels while gallery preview stays bounded',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'full-plane-'));
 try{
  const b=Buffer.alloc(1024+1024*2*2*4);[1024,2,2].forEach((n,i)=>b.writeInt32LE(n,i*4));b.writeInt32LE(2,12);
  for(let i=0;i<4096;i++)b.writeFloatLE(i,1024+i*4);
  await fs.writeFile(path.join(root,'a.mrc'),b);
  const small=await galleryImage(root,[],'a.mrc',512,true,'Z',false,0),full=await galleryImage(root,[],'a.mrc',16384,true,'Z',false,0);
  assert.equal(small.scale,.5);assert.equal(small.output.readUInt32LE(0),512);
  assert.equal(full.scale,1);assert.equal(full.output.readUInt32LE(0),1024);assert.equal(full.output.readFloatLE(8+4*999),999);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('support focus selects center slices using per-axis spacing and clamps bounds',()=>{
 const g={dimensions:[100,80,60],voxelSize:[2,4,8]},s={center:[20,-40,80]};
 assert.equal(supportCenterSlice(s,g,'X'),60);
 assert.equal(supportCenterSlice(s,g,'Y'),30);
 assert.equal(supportCenterSlice(s,g,'Z'),40);
 assert.equal(supportCenterSlice({points:[[0,0,0],[40,20,0]]},g,'X'),60);
 assert.equal(supportCenterSlice({contours:[[[0,0,-80]],[[0,0,80]]]},g,'Z'),30);
 assert.equal(supportCenterSlice({center:[999,0,0]},g,'X'),99);
 assert.equal(supportCenterSlice({points:[]},g,'X'),null);
});

test('sphere slice guides use equal-area latitude and matching pole frames',async()=>{
 const {sphereSliceGuide}=await import('../public/tomo-view.js');
 const s={type:'spheres',center:[0,0,0],radius:10};
 for(const axis of ['X','Y','Z']){
  const g={axis,slice:50,dimensions:[100,100,100],voxelSize:[1,1,1]};
  const guide=sphereSliceGuide(s,g,axis,.5);assert.equal(guide.y,.5);
  assert.ok(Math.abs(Math.hypot(...guide.end.map((v,i)=>v-guide.start[i]))-10)<1e-10);
  g.slice=55;assert.equal(sphereSliceGuide(s,g,axis).y,.25);
  g.slice=61;assert.equal(sphereSliceGuide(s,g,axis),null);
 }
 assert.equal(sphereSliceGuide(s,{axis:'X'},'Z'),null);
});
