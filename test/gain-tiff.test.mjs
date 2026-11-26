import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {gainTiffToMrc} from '../lib/gain-tiff.mjs';
import {collectScreeningGains,validateGainMrc} from '../lib/screening-gains.mjs';
const fixtures=new URL('./fixtures/gain-tiff/',import.meta.url);
const cases=JSON.parse(await fs.readFile(new URL('cases.json',fixtures)));
for(const c of cases)test('gain TIFF '+c.file+' preserves samples and IMOD row order',async()=>{
 const output=gainTiffToMrc(await fs.readFile(new URL(c.file,fixtures)));
 assert.equal(output.readInt32LE(0),c.width);assert.equal(output.readInt32LE(4),c.height);assert.equal(output.readInt32LE(12),2);
 let min=Infinity,max=-Infinity,sum=0;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const i=(c.height-1-y)*c.width+x;
  const expected=Math.fround(c.mode==='L'?(i*137+Math.floor(i/7)*53)%251:c.mode==='I;16'?(i*1597)%65536:((i*23)%311)/17+0.25);
  assert.equal(output.readFloatLE(1024+(y*c.width+x)*4),expected);
  min=Math.min(min,expected);max=Math.max(max,expected);sum+=expected;
 }
 assert.equal(output.readFloatLE(76),min);assert.equal(output.readFloatLE(80),max);
 assert.ok(Math.abs(output.readFloatLE(84)-sum/(c.width*c.height))<.01);
 assert.equal(output.toString('ascii',208,212),'MAP ');validateGainMrc(output);
});
test('big-endian 16-bit TIFF',async()=>{
 const out=gainTiffToMrc(await fs.readFile(new URL('big-endian.tif',fixtures)));
 assert.deepEqual(Array.from({length:6},(_,i)=>out.readFloatLE(1024+i*4)),[7,8,9,1,256,65535]);
});
test('gain collection handles nested names, collisions, MRC byte copying and reuse',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gain-')),project=path.join(root,'project'),source=path.join(root,'collection');
 try{
  await fs.mkdir(project);await fs.mkdir(path.join(source,'sub'),{recursive:true});
  const tiff=await fs.readFile(new URL('big-endian.tif',fixtures)),mrc=gainTiffToMrc(tiff);
  await fs.writeFile(path.join(source,'Gain.tif'),tiff);await fs.writeFile(path.join(source,'sub/Gain.tif'),tiff);
  await fs.writeFile(path.join(source,'other_gain.MRC'),mrc);await fs.writeFile(path.join(source,'preview.jpg'),'ignore');await fs.writeFile(path.join(source,'gain-notes.txt'),'ignore');
  const result=await collectScreeningGains(project,[source],source);assert.equal(result.length,3);assert.equal(new Set(result.map(x=>x.file)).size,3);
  for(const r of result)assert.deepEqual(await fs.readFile(path.join(project,r.file)),mrc);
  assert.ok((await collectScreeningGains(project,[source],source)).every(r=>r.reused));
  await fs.writeFile(path.join(source,'bad_gain.tif'),'bad');await assert.rejects(collectScreeningGains(project,[source],source),/Invalid gain image/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('corrupt TIFF and MRC fail instead of producing plausible output',async()=>{
 assert.throws(()=>gainTiffToMrc(Buffer.from('invalid')),/Gain TIFF/);
 const b=await fs.readFile(new URL('big-endian.tif',fixtures));
 assert.throws(()=>gainTiffToMrc(b.subarray(0,b.length-3)),/truncated/);
 assert.throws(()=>validateGainMrc(Buffer.alloc(1024)),/invalid/);
});

function syntheticTiff({big=false,tiled=false,predictor=1,orientation=1}={}){
 const nx=3,ny=3,bw=tiled?2:3,bh=2,cols=Math.ceil(nx/bw),blocks=cols*Math.ceil(ny/bh),raw=[];
 for(let k=0;k<blocks;k++){
  const x0=k%cols*bw,y0=Math.floor(k/cols)*bh,h=tiled?bh:Math.min(bh,ny-y0),b=Buffer.alloc(bw*h*2);
  for(let y=0;y<h;y++)for(let x=0;x<bw;x++){const v=(y0+y)*nx+x0+x+1,prev=x?v-1:0;b.writeUInt16LE(predictor===2?v-prev:v,(y*bw+x)*2);}
  raw.push(b);
 }
 const tags=[[256,4,[nx]],[257,4,[ny]],[258,3,[16]],[259,3,[1]],[262,3,[1]],[274,3,[orientation]],[277,3,[1]],[317,3,[predictor]]];
 if(tiled)tags.push([322,4,[bw]],[323,4,[bh]]);
 else tags.push([278,4,[bh]]);
 const offsets=[tiled?324:273,big?16:4,raw.map(()=>0)],counts=[tiled?325:279,4,raw.map(b=>b.length)];tags.push(offsets,counts);tags.sort((a,b)=>a[0]-b[0]);
 const out=Buffer.alloc(8192),ifd=big?16:8,esize=big?20:12,inline=big?8:4,base=ifd+(big?8:2);
 let cursor=base+tags.length*esize+(big?8:4);
 const u64=(v,o)=>out.writeBigUInt64LE(BigInt(v),o);
 out.write('II');out.writeUInt16LE(big?43:42,2);
 if(big){out.writeUInt16LE(8,4);u64(ifd,8);u64(tags.length,ifd);}else{out.writeUInt32LE(ifd,4);out.writeUInt16LE(tags.length,ifd);}
 const entries=[];
 for(let j=0;j<tags.length;j++){
  const [id,type,values]=tags[j],p=base+j*esize,size=type===3?2:type===4?4:8,bytes=values.length*size,v=p+(big?12:8);
  out.writeUInt16LE(id,p);out.writeUInt16LE(type,p+2);if(big)u64(values.length,p+4);else out.writeUInt32LE(values.length,p+4);
  const start=bytes<=inline?v:cursor;if(bytes>inline){if(big)u64(start,v);else out.writeUInt32LE(start,v);cursor+=bytes;}
  entries.push({id,type,values,start,size});
 }
 raw.forEach((b,i)=>{offsets[2][i]=cursor;b.copy(out,cursor);cursor+=b.length;});
 for(const {type,values,start,size} of entries)values.forEach((v,k)=>{if(type===3)out.writeUInt16LE(v,start+k*size);else if(type===4)out.writeUInt32LE(v,start+k*size);else u64(v,start+k*size);});
 return out.subarray(0,cursor);
}
for(const big of [false,true])for(const tiled of [false,true])test('gain TIFF directory/blocks: BigTIFF='+big+', tiles='+tiled,()=>{
 const result=gainTiffToMrc(syntheticTiff({big,tiled,predictor:2}));
 assert.deepEqual(Array.from({length:9},(_,i)=>result.readFloatLE(1024+4*i)),[7,8,9,4,5,6,1,2,3]);
});
test('unsupported predictor fails explicitly',()=>assert.throws(()=>gainTiffToMrc(syntheticTiff({predictor:3})),/unsupported predictor/));
test('gain images with nonstandard extensions are identified by content',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gain-signature-')),project=path.join(root,'project'),source=path.join(root,'source');
 try{
  await fs.mkdir(project);await fs.mkdir(source);
  const tiff=await fs.readFile(new URL('big-endian.tif',fixtures)),mrc=gainTiffToMrc(tiff);
  await fs.writeFile(path.join(source,'detector.gain'),mrc);
  await fs.writeFile(path.join(source,'GainReference'),tiff);
  const results=await collectScreeningGains(project,[source],source);assert.equal(results.length,2);
  assert.equal(results.find(r=>r.source==='detector.gain').converted,false);
  assert.equal(results.find(r=>r.source==='GainReference').converted,true);
  assert.ok(results.every(r=>r.file.endsWith('.mrc')));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

for(const big of [false,true])for(const orientation of [1,2,3,4,5,6,7,8])test('gain orientation '+orientation+' BigTIFF='+big+' keeps IMOD pixel order',()=>{
 const warnings=[];
 const out=gainTiffToMrc(syntheticTiff({big,orientation}),{onWarning:m=>warnings.push(m)});
 assert.deepEqual(Array.from({length:9},(_,i)=>out.readFloatLE(1024+4*i)),[7,8,9,4,5,6,1,2,3]);
 assert.equal(warnings.length,orientation===1?0:1);
});
test('invalid TIFF orientation is rejected',()=>assert.throws(()=>gainTiffToMrc(syntheticTiff({orientation:9})),/invalid TIFF orientation/));
test('non-default orientation EER .gain converts and reports its convention',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gain-orientation-')),project=path.join(root,'project'),source=path.join(root,'source');
 try{
  await fs.mkdir(project);await fs.mkdir(source);
  await fs.writeFile(path.join(source,'EER_GainReference.gain'),syntheticTiff({orientation:4}));
  const messages=[],result=await collectScreeningGains(project,[source],source,m=>messages.push(m));
  assert.equal(result.length,1);assert.equal(result[0].file,'EER_GainReference.mrc');
  assert.match(result[0].warnings[0],/orientation tag 4/);
  assert.ok(messages.some(m=>m.includes('orientation tag 4')));
  validateGainMrc(await fs.readFile(path.join(project,result[0].file)));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
