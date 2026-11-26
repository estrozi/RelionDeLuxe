import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {tiffFrameCount} from '../lib/tiff-frames.mjs';
for(const big of [false,true])for(const le of [false,true])test('TIFF directory count '+JSON.stringify({big,le}),async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'frame-header-'));
 try{
  const b=Buffer.alloc(128);
  b.write(le?'II':'MM');
  const w16=(v,o)=>le?b.writeUInt16LE(v,o):b.writeUInt16BE(v,o);
  const w32=(v,o)=>le?b.writeUInt32LE(v,o):b.writeUInt32BE(v,o);
  const w64=(v,o)=>le?b.writeBigUInt64LE(BigInt(v),o):b.writeBigUInt64BE(BigInt(v),o);
  w16(big?43:42,2);
  if(big){w16(8,4);w64(32,8);w64(0,32);w64(64,40);w64(0,64);w64(0,72);}
  else {w32(32,4);w16(0,32);w32(64,34);w16(0,64);w32(0,66);}
  const file=path.join(dir,'movie.tiff');await fs.writeFile(file,b);
  assert.equal(await tiffFrameCount(file),2);
  if(big)w64(32,72);else w32(32,66);
  await fs.writeFile(file,b);await assert.rejects(tiffFrameCount(file),/Cyclic/);
  await fs.writeFile(file,'not a TIFF file');assert.equal(await tiffFrameCount(file),null);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
