import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {parseStar,galleryManifest,galleryImage} from '../lib/gallery.mjs';
test('STAR tokenizer preserves quoted paths, comments, multiline values and block boundaries',()=>{
 const b=parseStar('data_general\n_note\n;multi\nline\n;\ndata_particles\nloop_\n_rlnImageName #1\n_rlnClassNumber #2\n"1@some path.mrcs" 2\n\'data_literal\' 3\n');
 assert.equal(b[1].values.note,'multi\nline');assert.equal(b[2].tables[0].rows[0].rlnImageName,'1@some path.mrcs');assert.equal(b[2].tables[0].rows[1].rlnImageName,'data_literal');assert.throws(()=>parseStar('data_x\nloop_\n_a\n_b\n1'),/Incomplete/);
});
test('Optimiser traversal, original stack slices, half floats and path restrictions',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gallery-'));try{
 await fs.writeFile(path.join(root,'optimiser.star'),'data_optimiser_general\n_rlnModelStarFile model.star\n');
 await fs.writeFile(path.join(root,'model.star'),'data_model_general\n_rlnPixelSize 1.5\ndata_model_classes\nloop_\n_rlnReferenceImage\n_rlnClassDistribution\n1@classes.mrcs 0.6\n2@classes.mrcs 0.4\n');
 const m=await galleryManifest(root,[],'optimiser.star');assert.equal(m.rows.length,2);assert.equal(m.rows[0].pixelSize,1.5);
 const bytes=Buffer.alloc(1024+32);for(const offset of [0,4,8])bytes.writeInt32LE(2,offset);bytes.writeInt32LE(2,12);for(let i=0;i<8;i++)bytes.writeFloatLE(i,1024+4*i);await fs.writeFile(path.join(root,'classes.mrcs'),bytes);
 const image=await galleryImage(root,[],'2@classes.mrcs');assert.equal(image.output.readUInt32LE(0),2);assert.equal(image.output.readFloatLE(8),4);assert.equal(image.output.readFloatLE(20),7);
 await assert.rejects(galleryImage(root,[],'3@classes.mrcs'),/index/);await assert.rejects(galleryImage(root,[],'classes.mrcs'),/3D/);
 bytes.writeInt32LE(12,12);bytes.writeUInt16LE(0x3c00,1024);await fs.writeFile(path.join(root,'half.mrcs'),bytes);assert.equal((await galleryImage(root,[],'1@half.mrcs')).output.readFloatLE(8),1);
 await fs.writeFile(path.join(root,'loop.star'),'data_optimiser_general\n_rlnModelStarFile loop.star\n');await assert.rejects(galleryManifest(root,[],'loop.star'),/Circular/);
 await fs.symlink('/etc/passwd',path.join(root,'outside.mrc'));await assert.rejects(galleryImage(root,[],'outside.mrc'),/outside/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('Micrograph galleries prefer CTF diagnostics and accept RELION :mrc suffixes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ctf-gallery-'));try{
 await fs.writeFile(path.join(root,'micrographs_selected.star'),'data_micrographs\nloop_\n_rlnMicrographName\n_rlnCtfImage\n_rlnDefocusU\nmic.mrc diagnostic.ctf:mrc 12000\n');
 const manifest=await galleryManifest(root,[],'micrographs_selected.star');assert.deepEqual(manifest.imageColumns,['rlnCtfImage','rlnMicrographName']);assert.equal(manifest.rows[0].rlnDefocusU,'12000');
 const bytes=Buffer.alloc(1040);bytes.writeInt32LE(2,0);bytes.writeInt32LE(2,4);bytes.writeInt32LE(1,8);bytes.writeInt32LE(2,12);bytes.writeFloatLE(7,1024);await fs.writeFile(path.join(root,'diagnostic.ctf'),bytes);
 assert.equal((await galleryImage(root,[],'diagnostic.ctf:mrc')).output.readFloatLE(8),7);
 await fs.writeFile(path.join(root,'micrographs.star'),'data_micrographs\nloop_\n_rlnMicrographName\nmic.mrc\n');assert.deepEqual((await galleryManifest(root,[],'micrographs.star')).imageColumns,['rlnMicrographName']);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('3D class previews read the central Z slice without changing indexed stack selection',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'central-'));try{for(const nz of [3,4]){const b=Buffer.alloc(1024+2*2*nz*4);b.writeInt32LE(2,0);b.writeInt32LE(2,4);b.writeInt32LE(nz,8);b.writeInt32LE(2,12);for(let i=0;i<4*nz;i++)b.writeFloatLE(i,1024+4*i);await fs.writeFile(path.join(p,'class.mrc'),b);assert.equal((await galleryImage(p,[],'class.mrc',512,true)).output.readFloatLE(8),4*Math.floor(nz/2));assert.equal((await galleryImage(p,[],'1@class.mrc',512,true)).output.readFloatLE(8),0);await assert.rejects(galleryImage(p,[],'class.mrc'),/3D volume/);}}finally{await fs.rm(p,{recursive:true,force:true});}});
test('central X and Y planes preserve voxel order and dimensions',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'axes-'));try{const b=Buffer.alloc(1024+3*4*5*4);for(const [o,v] of [[0,3],[4,4],[8,5],[12,2]])b.writeInt32LE(v,o);for(let z=0;z<5;z++)for(let y=0;y<4;y++)for(let x=0;x<3;x++)b.writeFloatLE(100*z+10*y+x,1024+4*(z*12+y*3+x));await fs.writeFile(path.join(p,'v.mrc'),b);for(const [axis,w,h,first,last] of [['X',4,5,1,431],['Y',3,5,20,422],['Z',3,4,200,232]]){const {output}=await galleryImage(p,[],'v.mrc',512,true,axis);assert.equal(output.readUInt32LE(0),w);assert.equal(output.readUInt32LE(4),h);assert.equal(output.readFloatLE(8),first);assert.equal(output.readFloatLE(output.length-4),last);}}finally{await fs.rm(p,{recursive:true,force:true});}});
