import fs from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {countMatchingFiles} from './file-pattern.mjs';
import {resolveExecutable} from './executables.mjs';
export function frameHint(stdout){const frames=stdout.split(/\r?\n/).filter(line=>line.trim()).length;if(!frames)throw Error('Image handler returned no statistics.');return {frames,hint:frames===1?'Probably No':"Probably Yes, I'm counting "+frames+' frames.'};}
// MRC --stats may describe a whole stack in one line. NZ, not stdout
// line count (nor MZ/ISPG), is the raw-import frame count requested here.
export function mrcHeaderInfo(header){
 if(header.length<1024)throw Error('Incomplete MRC header; cannot determine frame count.');
 const read=little=>{const int=o=>little?header.readInt32LE(o):header.readInt32BE(o);return {dimensions:[int(0),int(4),int(8)],mode:int(12)};};
 const valid=v=>v.dimensions.every(n=>n>0&&n<=1000000)&&[0,1,2,3,4,6,12,16].includes(v.mode);
 let values;
 if(header[212]===17&&header[213]===17)values=read(false);
 else if(header[212]===68&&[65,68].includes(header[213]))values=read(true);
 else {const candidates=[read(true),read(false)].filter(valid);if(candidates.length!==1)throw Error('Invalid or ambiguous MRC header byte order; cannot determine frame count.');values=candidates[0];}
 if(!valid(values))throw Error('Invalid MRC dimensions or unsupported mode; cannot determine frame count.');
 return {frames:values.dimensions[2],dimensions:values.dimensions,mode:values.mode};
}
export function mrcFrameCount(header){return mrcHeaderInfo(header).frames;}
async function mrcFrames(file){
 const handle=await fs.open(file,'r');try{const header=Buffer.alloc(1024);const {bytesRead}=await handle.read(header,0,1024,0);return mrcFrameCount(header.subarray(0,bytesRead));}finally{await handle.close();}
}
export async function importFrames(project,roots,pattern){
 if(typeof pattern!=='string'||!pattern.trim()||pattern.length>16384)throw Error('Enter an input movie/micrograph pattern first.');
 const file=await countMatchingFiles(project,roots,pattern,true);if(!file)throw Error('No matching input file.');
 if(/\.mrcs?$/i.test(file)){const frames=await mrcFrames(file);return {frames,hint:frames===1?'Probably No':"Probably Yes, I'm counting "+frames+' frames.',file};}
 const executable=await resolveExecutable('relion_image_handler',{cwd:project});if(!executable)throw Error('relion_image_handler is not available in the server PATH.');
 const {stdout}=await promisify(execFile)(executable,['--i',file,'--stats'],{cwd:project,timeout:60000,maxBuffer:8*1024*1024});
 return {...frameHint(stdout),file};
}
