import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {galleryImage} from '../lib/gallery.mjs';
import {attachTomogramParticles} from '../lib/tomogram-overlay.mjs';
import {projectedTomogramPicks} from '../public/tomogram-coordinates.js';
test('arbitrary XYZ slices preserve voxel geometry and original samples',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-slices-'));
 try{
  const b=Buffer.alloc(1024+4*6*8*4);
  [4,6,8].forEach((n,i)=>{b.writeInt32LE(n,i*4);b.writeInt32LE(n,28+i*4);b.writeFloatLE(n*2,40+i*4);});
  b.writeInt32LE(2,12);
  for(let z=0;z<8;z++)for(let y=0;y<6;y++)for(let x=0;x<4;x++)b.writeFloatLE(100*z+10*y+x,1024+4*((z*6+y)*4+x));
  await fs.writeFile(path.join(root,'vol.mrc'),b);
  for(const [axis,expected,w,h]of [['Z',700,4,6],['Y',50,4,8],['X',3,6,8]]){
   const im=await galleryImage(root,[],'vol.mrc',512,true,axis,false,1);
   assert.equal(im.output.readFloatLE(8),expected);assert.equal(im.nx,w);assert.equal(im.ny,h);
   assert.deepEqual(im.dimensions,[4,6,8]);assert.deepEqual(im.voxelSize,[2,2,2]);
  }
  await assert.rejects(galleryImage(root,[],'vol.mrc',512,true,'Z',false,2),/slice position/);
  await fs.writeFile(path.join(root,'particles.star'),'data_particles\nloop_\n_rlnTomoName\n_rlnCenteredCoordinateXAngst\n_rlnCenteredCoordinateYAngst\n_rlnCenteredCoordinateZAngst\nA 0 0 0\nB 2 4 6\nA nan 0 0\n');
  const manifest=await attachTomogramParticles(root,[],{rows:[{rlnTomoName:'A'},{rlnTomoName:'C'}]},'particles.star');
  assert.deepEqual(manifest.rows[0].tomoPicks,[[0,0,0]]);assert.deepEqual(manifest.rows[1].tomoPicks,[]);assert.match(manifest.overlayWarning,/1 invalid/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('centered Angstrom and unbinned pixel coordinates project onto matching axes and depth',()=>{
 const geometry={dimensions:[100,80,60],voxelSize:[4,4,4],slice:30,axis:'Z'};
 const row={tomoPickUnits:'angstrom',tomoPicks:[[0,0,0],[8,0,40]]};
 assert.deepEqual(projectedTomogramPicks(row,geometry,.5,2).points,[[25,20]]);
 assert.deepEqual(projectedTomogramPicks(row,{...geometry,axis:'X',slice:50},.5,0).points,[[20,15]]);
 const legacy={tomoPickUnits:'unbinned-pixel',rlnTomoTomogramBinning:'4',tomoPicks:[[200,160,120]]};
 assert.deepEqual(projectedTomogramPicks(legacy,geometry,1,0).points,[[50,40]]);
 assert.match(projectedTomogramPicks({...legacy,rlnTomoTomogramBinning:''},geometry,1).warning,/binning/);
});

test('centered overlays add XYZ Angstrom origins before projection, without changing STAR data',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-origins-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const text='data_particles\nloop_\n_rlnTomoName\n_rlnCenteredCoordinateXAngst\n_rlnCenteredCoordinateYAngst\n_rlnCenteredCoordinateZAngst\n_rlnOriginXAngst\n_rlnOriginYAngst\n_rlnOriginZAngst\nA 8 -4 12 -4 12 -8\nA 0 0 0 nan 0 0\n';
 await fs.writeFile(path.join(root,'particles.star'),text);
 const manifest=await attachTomogramParticles(root,[],{rows:[{rlnTomoName:'A'}]},'particles.star');
 assert.deepEqual(manifest.rows[0].tomoPicks,[[4,8,4]]);assert.match(manifest.overlayWarning,/1 invalid/);
 const g={dimensions:[100,100,100],voxelSize:[4,4,4],axis:'Z',slice:51};
 assert.deepEqual(projectedTomogramPicks(manifest.rows[0],g,1,0).points,[[51,52]]);
 assert.deepEqual(projectedTomogramPicks(manifest.rows[0],{...g,axis:'Y',slice:52},1,0).points,[[51,51]]);
 assert.deepEqual(projectedTomogramPicks(manifest.rows[0],{...g,axis:'X'},1,0).points,[[52,51]]);
 assert.equal(await fs.readFile(path.join(root,'particles.star'),'utf8'),text);
});
test('absent origin axes default to zero and legacy pixel coordinates remain unchanged',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-origin-optional-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const centered of [true,false]){
  const labels=['X','Y','Z'].map(a=>'_rln'+(centered?'CenteredCoordinate'+a+'Angst':'Coordinate'+a));
  await fs.writeFile(path.join(root,'particles.star'),'data_particles\nloop_\n_rlnTomoName\n'+labels.join('\n')+'\n_rlnOriginXAngst\nA 1 2 3 4\n');
  const m=await attachTomogramParticles(root,[],{rows:[{rlnTomoName:'A'}]},'particles.star');
  assert.deepEqual(m.rows[0].tomoPicks,[centered?[5,2,3]:[1,2,3]]);
 }
});
