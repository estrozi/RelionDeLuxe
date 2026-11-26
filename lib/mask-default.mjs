import path from 'node:path';
import {readablePath} from './paths.mjs';
const particle=n=>n?.type?.startsWith('ParticleGroupMetadata.');
export function nearestExtractions(state,input,extractType){
 const nodes=new Map(state.nodes.map(n=>[n.name,n]));
 for(const job of state.jobs)if(job.alias&&job.alias!=='None'&&input.startsWith(job.alias))input=job.name+input.slice(job.alias.length);
 if(!particle(nodes.get(input)))return [];
 const producers=new Map();for(const job of state.jobs)for(const out of job.outputs)producers.set(out,job);
 let queue=[input];const visited=new Set();
 while(queue.length){
  const found=new Map(),next=[];
  for(const file of queue){const job=producers.get(file);if(!job||visited.has(job.name))continue;visited.add(job.name);
   if(job.type===extractType)found.set(job.name,job);
   else next.push(...job.inputs.filter(n=>particle(nodes.get(n))));
  }
  if(found.size)return [...found.values()];queue=next;
 }
 return [];
}
export function diameterFromOptics(rows){
 if(!rows.length)throw new Error('No optics rows with pixel and box sizes were found.');
 const diameters=rows.map(({pixelSize,boxSize})=>{
  if(!Number.isFinite(pixelSize)||pixelSize<=0||!Number.isInteger(boxSize)||boxSize<=4)throw new Error('Optics pixel/box sizes are missing or invalid.');
  const d=pixelSize*(boxSize-4);if(!Number.isFinite(d)||d<=0)throw new Error('Invalid calculated diameter.');return d;
 });
 const d=diameters[0];if(diameters.some(x=>Math.abs(x-d)>Math.max(1,Math.abs(d))*1e-9))throw new Error('Optics groups have different mask diameters; enter a value manually.');
 return d;
}
export async function maskDefault(project,readRoots,adapter,state,input,extractType){
 if(typeof input!=='string'||!input)return {diameter:null,reason:'Select a particle STAR file to calculate a default.'};
 if(path.isAbsolute(input))input=path.relative(project,input);
 input=path.posix.normalize(input);
 const sources=nearestExtractions(state,input,extractType);
 if(!sources.length)return {diameter:null,reason:'No related extraction job was found; the mask diameter is unchanged.'};
 try{
  const results=[];
  for(const job of sources){
   const file=job.outputs.find(n=>path.posix.basename(n)==='particles.star'&&state.nodes.some(x=>x.name===n&&particle(x)));
   if(!file)throw new Error('The nearest extraction has no registered particles.star output.');
   const real=await readablePath(project,readRoots,file),data=await adapter.call(['particle-optics',real]);
   results.push({file,diameter:diameterFromOptics(data.rows),optics:data.rows});
  }
  const d=results[0].diameter;
  if(results.some(x=>Math.abs(x.diameter-d)>Math.max(1,Math.abs(d))*1e-9))throw new Error('Equally close extraction jobs give different mask diameters; enter a value manually.');
  return {diameter:String(Number(d.toPrecision(12))),sources:results};
 }catch(e){return {diameter:null,reason:'Could not calculate a mask default: '+(e.code==='ENOENT'?'extraction particles.star is not available yet.':e.message)};}
}
