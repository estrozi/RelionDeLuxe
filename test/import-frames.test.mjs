import test from 'node:test';import assert from 'node:assert/strict';import {frameHint} from '../lib/import-frames.mjs';
test('Import frame hints count nonempty statistics lines',()=>{assert.deepEqual(frameHint('stats\n'),{frames:1,hint:'Probably No'});assert.equal(frameHint('frame1\r\nframe2\r\n\n').hint,"Probably Yes, I'm counting 2 frames.");assert.throws(()=>frameHint('\n'),/no statistics/);});

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {mrcFrameCount,importFrames} from '../lib/import-frames.mjs';
function header(nz,little=true,stamp=true){const b=Buffer.alloc(1024),write=(v,o)=>little?b.writeInt32LE(v,o):b.writeInt32BE(v,o);write(4096,0);write(4096,4);write(nz,8);write(12,12);write(1,36);b.write('MAP ',208);if(stamp){b[212]=little?68:17;b[213]=little?65:17;}return b;}
test('MRC import counts NZ for float16 stacks and single images in either byte order',()=>{
 for(const little of [true,false])for(const stamp of [true,false])for(const nz of [1,40])assert.equal(mrcFrameCount(header(nz,little,stamp)),nz);
 assert.throws(()=>mrcFrameCount(header(0)),/Invalid/);assert.throws(()=>mrcFrameCount(Buffer.alloc(20)),/Incomplete/);
});
test('MRC frame detection reads only the header, without invoking an image handler',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mrc-frames-'));
 try{await fs.writeFile(path.join(dir,'movie.MRC'),header(37));const result=await importFrames(dir,[],'*.MRC');assert.equal(result.frames,37);assert.match(result.hint,/37 frames/);
 await fs.writeFile(path.join(dir,'movie.MRC'),header(1));assert.equal((await importFrames(dir,[],'*.MRC')).frames,1);
 await fs.writeFile(path.join(dir,'movie.MRC'),Buffer.alloc(12));await assert.rejects(importFrames(dir,[],'*.MRC'),/Incomplete/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
