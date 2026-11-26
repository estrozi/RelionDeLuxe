// Count main TIFF image directories, matching RELION rwTIFF.h.
// Only directory counts and links are read, never pixel strips or tiles.
import fs from 'node:fs/promises';
export async function tiffFrameCount(file,checkAbort=async()=>{}){
 const h=await fs.open(file,'r');
 try{
  const {size}=await h.stat();
  const read=async(offset,length)=>{
   if(!Number.isSafeInteger(offset)||offset<0||offset+length>size)throw Error('Invalid or truncated TIFF directory.');
   const b=Buffer.alloc(length);let done=0;
   while(done<length){const r=await h.read(b,done,length-done,offset+done);if(!r.bytesRead)throw Error('Truncated TIFF directory.');done+=r.bytesRead;}
   return b;
  };
  if(size<8)return null;
  const header=await read(0,Math.min(16,size)),order=header.toString('ascii',0,2);
  if(order!=='II'&&order!=='MM')return null;
  const le=order==='II',u16=b=>le?b.readUInt16LE():b.readUInt16BE(),u32=b=>le?b.readUInt32LE():b.readUInt32BE();
  const u64=b=>{const n=Number(le?b.readBigUInt64LE():b.readBigUInt64BE());if(!Number.isSafeInteger(n))throw Error('TIFF offset exceeds safe range.');return n;};
  const version=u16(header.subarray(2));if(version!==42&&version!==43)return null;
  const big=version===43;
  if(big&&(header.length<16||u16(header.subarray(4))!==8||u16(header.subarray(6))!==0))throw Error('Invalid BigTIFF header.');
  let offset=big?u64(header.subarray(8)):u32(header.subarray(4)),frames=0;
  const seen=new Set();
  while(offset){
   await checkAbort();
   if(seen.has(offset)||frames>=100000)throw Error('Cyclic or excessive TIFF image directories.');
   seen.add(offset);
   const n=big?u64(await read(offset,8)):u16(await read(offset,2));
   const next=offset+(big?8:2)+n*(big?20:12);
   offset=big?u64(await read(next,8)):u32(await read(next,4));frames++;
  }
  if(!frames)throw Error('TIFF has no image directories.');
  return frames;
 }finally{await h.close();}
}
