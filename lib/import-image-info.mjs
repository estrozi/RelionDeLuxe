import fs from 'node:fs/promises';
import path from 'node:path';
import {countMatchingFiles} from './file-pattern.mjs';
import {mrcHeaderInfo} from './import-frames.mjs';
import {readablePath} from './paths.mjs';
export async function importImageInfo(project,roots,pattern){
 const file=await countMatchingFiles(project,roots,pattern,true);if(!file)return null;
 const target=await readablePath(project,roots,file),extension=path.extname(target).toLowerCase();
 if(['.mrc','.mrcs'].includes(extension)){const h=await fs.open(target,'r');try{const b=Buffer.alloc(1024),r=await h.read(b,0,1024,0),info=mrcHeaderInfo(b.subarray(0,r.bytesRead));return {file,width:info.dimensions[0],height:info.dimensions[1]};}finally{await h.close();}}
 if(['.tif','.tiff'].includes(extension))return {...await tiffDimensions(target),file};
 return null;
}
async function tiffDimensions(file){
 const h=await fs.open(file,'r');try{const stat=await h.stat(),read=async(offset,length)=>{if(offset<0||offset+length>stat.size)throw Error('Invalid TIFF directory.');const b=Buffer.alloc(length),r=await h.read(b,0,length,offset);if(r.bytesRead!==length)throw Error('Truncated TIFF directory.');return b;},header=await read(0,8),order=header.toString('ascii',0,2);if(order!=='II'&&order!=='MM')throw Error('Unsupported TIFF byte order.');const le=order==='II',u16=b=>le?b.readUInt16LE():b.readUInt16BE(),u32=b=>le?b.readUInt32LE():b.readUInt32BE();if(u16(header.subarray(2,4))!==42)throw Error('Unsupported TIFF format.');const offset=u32(header.subarray(4,8)),count=u16(await read(offset,2));let width,height;for(let i=0;i<count;i++){const entry=await read(offset+2+i*12,12),tag=u16(entry.subarray(0,2)),type=u16(entry.subarray(2,4)),n=u32(entry.subarray(4,8));if((tag===256||tag===257)&&n===1&&[3,4].includes(type)){const value=type===3?(le?entry.readUInt16LE(8):entry.readUInt16BE(8)):u32(entry.subarray(8,12));if(tag===256)width=value;else height=value;}}if(!(width>0&&height>0))throw Error('TIFF has no image dimensions.');return {width,height};}finally{await h.close();}}
