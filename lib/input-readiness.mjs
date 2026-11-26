import fs from 'node:fs/promises';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
export async function inputReadiness(project,roots,file,{optimiser=false,visited=new Set()}={}){
 try{
  const actual=await readablePath(project,roots,file),stat=await fs.stat(actual);
  if(visited.has(actual))return {available:false,reason:'Circular optimiser reference'};
  visited=new Set([...visited,actual]);
  if(!stat.isFile()||!stat.size)return {available:false,reason:'Input is empty or is not a regular file'};
  if(optimiser||/_optimis?er\.star$/i.test(file)){
   const blocks=parseStar(await fs.readFile(actual,'utf8'));
   for(const key of ['rlnModelStarFile','rlnExperimentalDataStarFile']){
    const reference=blocks.find(b=>b.values[key])?.values[key];
    if(!reference)return {available:false,reason:'Optimiser is not ready: missing _'+key};
    const ready=await inputReadiness(project,roots,reference,{visited});
    if(!ready.available)return {available:false,reason:'Optimiser reference is not ready: '+reference+' — '+ready.reason};
   }
  }
  return {available:true};
 }catch(e){return {available:false,reason:['ENOENT','ENOTDIR'].includes(e.code)?'Input file does not exist':e.message};}
}
