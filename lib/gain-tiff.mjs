// Dependency-free grayscale gain TIFF -> MRC reimplementation.
// Behavioral references: IMOD mrc/tif2mrc.c (James Kremer, David Mastronarde)
// and libiimod/iitif.c: decoded samples, bottom-up rows, MRC header statistics.
// Original IMOD copyright BL3DEMC / Regents of University of Colorado;
// see NOTICE. No libtiff or IMOD code/library is linked.
import {inflateSync} from 'node:zlib';
const MAX=512*1024*1024;
function fail(message){throw Error('Gain TIFF: '+message);}
function unpackLzw(src,length){
 const out=Buffer.alloc(length),dict=new Array(4096);let bit=0,width=9,next=258,previous=null,pos=0;
 const reset=()=>{for(let i=0;i<256;i++)dict[i]=Buffer.from([i]);width=9;next=258;previous=null;};reset();
 while(bit+width<=src.length*8){
  let code=0;for(let i=0;i<width;i++,bit++)code=(code<<1)|((src[bit>>3]>>(7-(bit&7)))&1);
  if(code===256){reset();continue;}if(code===257)break;
  let entry=code<next?dict[code]:code===next&&previous?Buffer.concat([previous,previous.subarray(0,1)]):null;
  if(!entry)fail('invalid LZW code');
  if(pos+entry.length>length)fail('LZW data exceeds expected dimensions');
  entry.copy(out,pos);pos+=entry.length;
  if(previous&&next<4096){dict[next++]=Buffer.concat([previous,entry.subarray(0,1)]);if(next===(1<<width)-1&&width<12)width++;}
  previous=entry;
 }
 if(pos!==length)fail('truncated LZW data');return out;
}
function decompress(src,compression,length){
 if(length>MAX||length<1)fail('decoded block exceeds size limit');
 if(compression===1){if(src.length<length)fail('truncated uncompressed block');return Buffer.from(src.subarray(0,length));}
 if(compression===5)return unpackLzw(src,length);
 if(compression===8||compression===32946){const result=inflateSync(src,{maxOutputLength:length});if(result.length!==length)fail('incorrect Deflate block size');return result;}
 if(compression===32773){
  const out=Buffer.alloc(length);let i=0,j=0;
  while(i<src.length&&j<length){const n=src.readInt8(i++);
   if(n>=0){const count=n+1;if(i+count>src.length||j+count>length)fail('invalid PackBits literal');src.copy(out,j,i,i+count);i+=count;j+=count;}
   else if(n!==-128){const count=1-n;if(i>=src.length||j+count>length)fail('invalid PackBits repeat');out.fill(src[i++],j,j+count);j+=count;}
  }
  if(j!==length)fail('truncated PackBits block');return out;
 }
 fail('unsupported compression '+compression+' (supported: none, LZW, Deflate, PackBits)');
}
export function gainTiffToMrc(data,{onWarning=()=>{}}={}){
 if(!Buffer.isBuffer(data)||data.length<8||data.length>MAX)fail('invalid file size (maximum 512 MiB)');
 const order=data.toString('ascii',0,2),le=order==='II';if(!le&&order!=='MM')fail('invalid byte order');
 const bounds=(o,n)=>{if(!Number.isSafeInteger(o)||o<0||!Number.isSafeInteger(n)||n<0||o+n>data.length)fail('truncated or invalid offset');};
 const u16=o=>{bounds(o,2);return le?data.readUInt16LE(o):data.readUInt16BE(o);};
 const u32=o=>{bounds(o,4);return le?data.readUInt32LE(o):data.readUInt32BE(o);};
 const u64=o=>{bounds(o,8);const n=Number(le?data.readBigUInt64LE(o):data.readBigUInt64BE(o));if(!Number.isSafeInteger(n))fail('offset too large');return n;};
 const version=u16(2),big=version===43;if(version!==42&&!big)fail('unsupported TIFF version');
 if(big&&(u16(4)!==8||u16(6)!==0))fail('invalid BigTIFF header');
 const ifd=big?u64(8):u32(4),count=big?u64(ifd):u16(ifd),base=ifd+(big?8:2),entrySize=big?20:12;
 if(!ifd||count>4096)fail('invalid image directory');bounds(base,count*entrySize+(big?8:4));
 if((big?u64(base+count*entrySize):u32(base+count*entrySize))!==0)fail('multiple image pages are not supported for a gain reference');
 const tags=new Map(),sizes={1:1,3:2,4:4,5:8,16:8,18:8};
 const wanted=new Set([256,257,258,259,262,273,274,277,278,279,282,283,284,296,317,322,323,324,325,339]);
 for(let i=0;i<count;i++){
  const p=base+i*entrySize,tag=u16(p),type=u16(p+2);if(!wanted.has(tag))continue;
  const n=big?u64(p+4):u32(p+4),size=sizes[type];if(!size||n<1||n>1000000)fail('unsupported tag encoding '+tag);
  const v=p+(big?12:8),start=n*size<=(big?8:4)?v:(big?u64(v):u32(v));bounds(start,n*size);
  const values=[];for(let k=0;k<n;k++){const o=start+k*size;values.push(type===1?data[o]:type===3?u16(o):type===4?u32(o):type===5?u32(o)/u32(o+4):u64(o));}
  if(tags.has(tag))fail('duplicate tag '+tag);tags.set(tag,values);
 }
 const one=(tag,def)=>tags.get(tag)?.[0]??def;
 const nx=one(256),ny=one(257),bits=one(258,8),format=one(339,1),compression=one(259,1),predictor=one(317,1);
 if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx<1||ny<1||nx*ny>64*1024*1024)fail('invalid or excessive dimensions (maximum 64 million pixels)');
 if(one(277,1)!==1||![0,1].includes(one(262,1)))fail('only single-channel grayscale gain images are supported');
 // IMOD iitif.c reads strips/tiles in stored order and reverses rows for MRC.
 // It does not apply TIFF display orientation; gain alignment must not acquire
 // an additional rotation/reflection merely because a camera writes this tag.
 const orientation=one(274,1);
 if(!Number.isInteger(orientation)||orientation<1||orientation>8)fail('invalid TIFF orientation '+orientation);
 if(orientation!==1)onWarning('TIFF orientation tag '+orientation+' retained as metadata only; using IMOD-style stored pixel order with the standard TIFF-to-MRC row reversal (no additional rotation/reflection).');
 if(![1,2,3].includes(format)||![8,16,32].includes(bits)||(format===3&&bits!==32))fail('supported samples: 8/16/32-bit integers or 32-bit floats');
 if(![1,2].includes(predictor)||(predictor===2&&format===3))fail('unsupported predictor '+predictor+' for this sample type');
 const bpp=bits/8,tiled=tags.has(324),bw=tiled?one(322):nx,bh=tiled?one(323):Math.min(one(278,ny),ny);
 if(!Number.isInteger(bw)||!Number.isInteger(bh)||bw<1||bh<1||bw*bh*bpp>MAX)fail('invalid strip/tile size');
 const cols=Math.ceil(nx/bw),blocks=cols*Math.ceil(ny/bh),offsets=tags.get(tiled?324:273),lengths=tags.get(tiled?325:279);
 if(!offsets||!lengths||offsets.length!==blocks||lengths.length!==blocks)fail('incomplete strip/tile table');
 const output=Buffer.alloc(1024+nx*ny*4);let min=Infinity,max=-Infinity,mean=0,m2=0,n=0;
 for(let block=0;block<blocks;block++){
  const x0=block%cols*bw,y0=Math.floor(block/cols)*bh,rows=tiled?bh:Math.min(bh,ny-y0),bytes=bw*rows*bpp;
  bounds(offsets[block],lengths[block]);const raw=decompress(data.subarray(offsets[block],offsets[block]+lengths[block]),compression,bytes);
  const view=new DataView(raw.buffer,raw.byteOffset,raw.byteLength);
  if(predictor===2)for(let y=0;y<rows;y++)for(let x=1;x<bw;x++){const p=(y*bw+x)*bpp,q=p-bpp;
   if(bits===8)raw[p]=(raw[p]+raw[q])&255;
   else if(bits===16)view.setUint16(p,view.getUint16(p,le)+view.getUint16(q,le),le);
   else view.setUint32(p,view.getUint32(p,le)+view.getUint32(q,le),le);
  }
  for(let y=0;y<Math.min(rows,ny-y0);y++)for(let x=0;x<Math.min(bw,nx-x0);x++){
   const p=(y*bw+x)*bpp;
   const value=Math.fround(format===3?view.getFloat32(p,le):bits===8?(format===2?view.getInt8(p):view.getUint8(p)):bits===16?(format===2?view.getInt16(p,le):view.getUint16(p,le)):(format===2?view.getInt32(p,le):view.getUint32(p,le)));
   if(!Number.isFinite(value))fail('non-finite sample in gain image');
   output.writeFloatLE(value,1024+((ny-1-y0-y)*nx+x0+x)*4);
   min=Math.min(min,value);max=Math.max(max,value);n++;const delta=value-mean;mean+=delta/n;m2+=delta*(value-mean);
  }
 }
 const i=(o,v)=>output.writeInt32LE(v,o),f=(o,v)=>output.writeFloatLE(v,o);
 i(0,nx);i(4,ny);i(8,1);i(12,2);i(28,nx);i(32,ny);i(36,1);
 const unit=one(296,1),xr=one(282),yr=one(283,xr),scale=unit===2?2.54e8:unit===3?1e8:0;
 const dx=scale&&Number.isFinite(xr)&&xr>0?scale/xr:1,dy=scale&&Number.isFinite(yr)&&yr>0?scale/yr:1;
 f(40,nx*dx);f(44,ny*dy);f(48,dx);f(52,90);f(56,90);f(60,90);i(64,1);i(68,2);i(72,3);
 f(76,min);f(80,max);f(84,mean);output.write('MAP ',208);output[212]=0x44;output[213]=0x41;f(216,Math.sqrt(m2/n));i(220,1);
 output.write('RelionDeLuxe gain TIFF conversion; IMOD bottom-up rows; unscaled float32',224,'ascii');
 return output;
}
