import fs from 'node:fs/promises';
import path from 'node:path';
import {jobPath,readablePath} from './paths.mjs';

// Do not offer a map while its voxel payload is still being written.
async function completeMap(file){
 const h=await fs.open(file,'r');
 try{
  const header=Buffer.alloc(1024),{bytesRead}=await h.read(header,0,1024,0);
  if(bytesRead!==1024)return false;
  for(const endian of ['LE','BE']){
   const n=o=>header['readInt32'+endian](o),x=n(0),y=n(4),z=n(8),bytes=({0:1,1:2,2:4,6:2,12:2})[n(12)],extra=n(92);
   const size=1024+extra+x*y*z*bytes;
   if(x>0&&y>0&&z>0&&bytes&&extra>=0&&Number.isSafeInteger(size)&&(await h.stat()).size>=size)return true;
  }
  return false;
 }finally{await h.close();}
}
export async function attachClassificationMaps(state,project,readRoots,layout){
 for(const job of state.jobs){
  if(job.status!=='Running'||layout.find(l=>l.id===job.type)?.name!=='3D classification')continue;
  job.intermediateMaps={};
  try{
   const dir=jobPath(project,job.name),entries=await fs.readdir(dir);
   for(const output of job.outputs){
    const match=path.basename(output).match(/^(.*?)(?:_it\d+)?_class(\d+)\.mrc$/);
    if(!match)continue;
    const candidates=entries.map(name=>({name,m:name.match(/^(.*?)_it(\d+)_class(\d+)\.mrc$/)}))
     .filter(c=>c.m&&c.m[1]===match[1]&&c.m[3]===match[2]).sort((a,b)=>Number(b.m[2])-Number(a.m[2]));
    for(const candidate of candidates){
     const file=job.name+candidate.name;
     try{if(await completeMap(await readablePath(project,readRoots,file))){job.intermediateMaps[output]=file;break;}}catch{}
    }
   }
  }catch{}
 }
 return state;
}
