import fs from 'node:fs/promises';
import path from 'node:path';
import {jobPath,readablePath} from './paths.mjs';
import {galleryImage} from './gallery.mjs';
const cache=new Map();
export async function initialModelThumbnail(project,roots,job,axis='Z',slice=null,expectedClasses=0){
 jobPath(project,job);
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice axis');
 if(slice!==null&&(!Number.isFinite(slice)||slice<0||slice>1))throw Error('Invalid slice position');
 try{return await thumbnail(project,roots,job+'initial_model.mrc',axis,slice);}
 catch{/* Until the final model is ready, show the latest complete class iteration. */}
 return classificationThumbnails(project,roots,job,axis,slice,expectedClasses);
}
export async function refinementThumbnail(project,roots,job,axis='Z',slice=null){
 if(slice!==null&&(!Number.isFinite(slice)||slice<0||slice>1))throw Error('Invalid slice position');
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice axis');
 const dir=jobPath(project,job);
 const names=(await fs.readdir(dir)).filter(n=>/^run_it\d+_half1_class001\.mrc$/.test(n)).sort((a,b)=>Number(b.match(/it(\d+)/)[1])-Number(a.match(/it(\d+)/)[1]));
 for(const name of names){
  try{
   return await thumbnail(project,roots,job+name,axis,slice);
  }catch{/* A currently written iteration is not ready; retain the previous one. */}
 }
 return {file:null};
}

async function thumbnail(project,roots,file,axis,slice){
   const actual=await readablePath(project,roots,file),stat=await fs.stat(actual);
   const key=actual+'|'+stat.size+'|'+stat.mtimeMs+'|'+axis+'|'+slice;
   if(cache.has(key))return cache.get(key);
   const image=await galleryImage(project,roots,file,64,true,axis,false,slice);
   const pixels=Array.from({length:image.output.readUInt32LE(0)*image.output.readUInt32LE(4)},(_,i)=>image.output.readFloatLE(8+i*4));
   const result={file,dimensions:image.dimensions,slice:image.slice,axis,width:image.output.readUInt32LE(0),height:image.output.readUInt32LE(4),pixels};
   if(cache.size>=100)cache.delete(cache.keys().next().value);
   cache.set(key,result);return result;
}

export async function classificationThumbnails(project,roots,job,axis='Z',slice=null,expectedClasses=0,requestedIteration=null){
 if(requestedIteration!==null&&(!Number.isSafeInteger(requestedIteration)||requestedIteration<0))throw Error('Invalid iteration');
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice axis');
 if(slice!==null&&(!Number.isFinite(slice)||slice<0||slice>1))throw Error('Invalid slice position');
 const names=await fs.readdir(jobPath(project,job)),iterations=new Map();
 for(const name of names){
  const m=name.match(/^run_it(\d+)_class(\d+)\.mrc$/);if(!m)continue;
  const iteration=Number(m[1]),id=Number(m[2]);if(!id)continue;
  if(!iterations.has(iteration))iterations.set(iteration,new Map());
  iterations.get(iteration).set(id,name);
 }
 const total=Number(expectedClasses)||Math.max(0,...[...iterations.values()].flatMap(m=>[...m.keys()]));
 for(const iteration of [...iterations.keys()].filter(i=>requestedIteration===null||i===requestedIteration).sort((a,b)=>b-a)){
  const maps=iterations.get(iteration);if(maps.size!==total)continue;
  try{
   const images=[];
   for(let id=1;id<=total;id++){
    if(!maps.has(id))throw Error('Incomplete iteration');
    images.push({...await thumbnail(project,roots,job+maps.get(id),axis,slice),classNumber:id});
   }
   if(!images.length)continue;
   if(images.some(i=>i.dimensions.some((d,k)=>d!==images[0].dimensions[k])))continue;
   return {iteration,images};
  }catch{/* Keep all classes on the same complete, readable iteration. */}
 }
 return {images:[]};
}

export async function maskThumbnail(project,roots,job,axis='Z',slice=null){
 jobPath(project,job);
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice axis');
 if(slice!==null&&(!Number.isFinite(slice)||slice<0||slice>1))throw Error('Invalid slice position');
 try{return {...await thumbnail(project,roots,job+'mask.mrc',axis,slice),mask:true};}
 catch{return {file:null};}
}

export async function reconstructionThumbnail(project,roots,job,axis='Z',slice=null){
 jobPath(project,job);
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice axis');
 if(slice!==null&&(!Number.isFinite(slice)||slice<0||slice>1))throw Error('Invalid slice position');
 for(const name of ['merged.mrc','half1.mrc','half2.mrc']){
  try{return await thumbnail(project,roots,job+name,axis,slice);}catch{/* A map may still be being written. */}
 }
 return {file:null};
}
