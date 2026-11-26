import {cropProbe} from '../public/probe-domain.js';
import fs from 'node:fs/promises';
import {readablePath} from './paths.mjs';
import {sampleSupports} from '../public/tomo-supports.js';
function half(v){const sign=v&32768?-1:1,e=(v>>10)&31,f=v&1023;return sign*(e===0?2**-14*f/1024:e===31?(f?NaN:Infinity):2**(e-15)*(1+f/1024));}
export async function openVoxelSampler(project,roots,file){
 const h=await fs.open(await readablePath(project,roots,file),'r');
 try{
  const header=Buffer.alloc(1024);if((await h.read(header,0,1024,0)).bytesRead!==1024)throw Error('Incomplete MRC header');
  const little=!(header[212]===17&&header[213]===17),int=o=>little?header.readInt32LE(o):header.readInt32BE(o),float=o=>little?header.readFloatLE(o):header.readFloatBE(o);
  const dimensions=[int(0),int(4),int(8)],mode=int(12),bytes=({0:1,1:2,2:4,6:2,12:2})[mode],base=1024+int(92),spacing=dimensions.map((_,i)=>float(40+4*i)/int(28+4*i));
  if(!bytes||dimensions.some(n=>n<1)||base<1024||base%bytes!==0||!Number.isSafeInteger(dimensions.reduce((a,b)=>a*b,1))||spacing.some(v=>!Number.isFinite(v)||v<=0))throw Error('Unsupported MRC geometry or voxel size');
  if([0,1,2].some(i=>int(64+4*i)!==0&&int(64+4*i)!==i+1))throw Error('Optimization requires standard MRC X/Y/Z axis ordering');
  const size=(await h.stat()).size;if(base+dimensions.reduce((a,b)=>a*b,1)*bytes>size)throw Error('Truncated MRC volume');
  const chunks=new Map(),blockSize=1024*1024;
  async function voxel(x,y,z){
   const offset=base+((z*dimensions[1]+y)*dimensions[0]+x)*bytes,block=Math.floor(offset/blockSize);
   let buffer=chunks.get(block);if(buffer){chunks.delete(block);chunks.set(block,buffer);}else{
    buffer=Buffer.alloc(Math.min(blockSize,size-block*blockSize));let done=0;
    while(done<buffer.length){const r=await h.read(buffer,done,buffer.length-done,block*blockSize+done);if(!r.bytesRead)throw Error('Truncated MRC volume');done+=r.bytesRead;}
    chunks.set(block,buffer);if(chunks.size>64)chunks.delete(chunks.keys().next().value);
   }
   const p=offset-block*blockSize;
   return mode===0?buffer.readInt8(p):mode===1?(little?buffer.readInt16LE(p):buffer.readInt16BE(p)):mode===2?(little?buffer.readFloatLE(p):buffer.readFloatBE(p)):mode===12?half(little?buffer.readUInt16LE(p):buffer.readUInt16BE(p)):(little?buffer.readUInt16LE(p):buffer.readUInt16BE(p));
  }
  return {dimensions,spacing,contains(position){
   return position.every((v,i)=>Number.isFinite(v)&&v/spacing[i]+dimensions[i]/2>=0&&v/spacing[i]+dimensions[i]/2<=dimensions[i]-1);
  },async sample(position){
   const xyz=position.map((v,i)=>v/spacing[i]+dimensions[i]/2);
   if(xyz.some((v,i)=>v<0||v>dimensions[i]-1))return null;
   const lo=xyz.map(Math.floor),hi=lo.map((v,i)=>Math.min(v+1,dimensions[i]-1)),t=xyz.map((v,i)=>v-lo[i]);let sum=0;
   for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
    const weight=(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);if(!weight)continue;
    const v=await voxel(x?hi[0]:lo[0],y?hi[1]:lo[1],z?hi[2]:lo[2]);if(!Number.isFinite(v))return null;sum+=weight*v;
   }
   return sum;
  },close:()=>h.close()};
 }catch(e){await h.close();throw e;}
}
export function translatedSupport(s,axis,delta){
 const result=structuredClone(s),index={X:0,Y:1,Z:2}[axis],move=p=>p.map((v,i)=>v+(i===index?delta:0));
 if(result.center)result.center=move(result.center);if(result.points)result.points=result.points.map(move);if(result.contours)result.contours=result.contours.map(c=>c.map(move));return result;
}
export async function optimizeSupport(s,axis,range,sampler,invert=false){
 if(!['X','Y','Z','R'].includes(axis)||!Number.isFinite(range)||range<=0||range>1000)throw Error('Choose a search range greater than 0 and at most 1000 Å');
 if(axis==='R'&&s.type!=='spheres')throw Error('Radius optimization requires a sphere');
 const start=Date.now(),cache=new Map();let evaluations=0;
 let ignoredOutside=0;
 const usable=sampleSupports([s],{contains:p=>!sampler.contains||sampler.contains(p),onOutside:()=>ignoredOutside++});
 if(!usable.length)throw Error('No remaining particles inside the tomogram to optimize');
 if(usable.length>20000)throw Error('Too many usable particles inside the tomogram to optimize (maximum 20000); increase spacing or remove particles.');

 const score=async delta=>{
  const key=delta.toPrecision(12);if(cache.has(key))return cache.get(key);
  if(Date.now()-start>60000)throw Error('Optimization exceeded 60 seconds; reduce the range or particle count');
  const candidate=axis==='R'?{...structuredClone(s),radius:Number(s.radius)+delta}:translatedSupport(s,axis,delta);
  // Fix the original angular lattice for every trial and persist it with the result.
  // Radius changes move surviving samples radially; excluded identities stay excluded.
  if(axis==='R')candidate.sphereSampleCount=s.sphereSampleCount??Math.max(4,Math.ceil(4*Math.PI*Number(s.radius)**2/Number(s.spacing)**2));
  if(axis==='R'&&candidate.radius<=0)return null;
  // Score the same surviving, initially in-volume particles for every trial.
  // Do not let particles entering/leaving the volume bias the objective.
  const samples=usable.map(p=>({...p,position:axis==='R'?p.position.map((v,i)=>s.center[i]+(v-s.center[i])*candidate.radius/Number(s.radius)):p.position.map((v,i)=>v+(i==={X:0,Y:1,Z:2}[axis]?delta:0))}));
  if(sampler.contains&&samples.some(p=>!sampler.contains(p.position))){cache.set(key,null);return null;}
  let total=0;for(let i=0;i<samples.length;i++){if(i%256===0&&Date.now()-start>60000)throw Error('Optimization exceeded 60 seconds');const v=await sampler.sample(samples[i].position);if(v===null||!Number.isFinite(v)){cache.set(key,null);return null;}total+=invert?-v:v;}
  const result={support:candidate,score:total/samples.length,count:samples.length,delta};evaluations++;cache.set(key,result);return result;
 };
 // Non-finite voxels inside the volume still require explicit cleanup.
 let nonFiniteCount=0;
 for(const p of usable){
  if(Date.now()-start>60000)throw Error('Optimization exceeded 60 seconds');
  const value=await sampler.sample(p.position);if(value===null||!Number.isFinite(value))nonFiniteCount++;
 }
 if(nonFiniteCount)return {blocked:true,outsideSamples:[],nonFiniteCount,ignoredOutside};
 const original=await score(0);if(!original)throw Error('Some current particles lie outside the volume or on non-finite voxels. Move/clean the support first.');
 let best=original;
 const consider=async d=>{const result=await score(d);if(result&&result.score<best.score-1e-10*Math.max(1,Math.abs(best.score)))best=result;};
 // Bounded coarse search followed by two local refinements; never accept a worse mean.
 let step=range/5;
 for(let i=-5;i<=5;i++)await consider(i*step);
 for(let level=0;level<2;level++){const center=best.delta;step/=5;for(let i=-4;i<=4;i++){const d=center+i*step;if(Math.abs(d)<=range)await consider(d);}}
 return {...best,ignoredOutside,before:original.score,improved:best!==original,evaluations,atBoundary:Math.abs(best.delta)>=range-1e-8};
}

export async function sphereProbe(s,sampler,poleAxis='Z',width=128){
 if(!Number.isInteger(width)||width<128||width>1024||width%2)throw Error('Probe width must be an even integer from 128 to 1024');
 if(!['X','Y','Z'].includes(poleAxis))throw Error('Invalid probe pole axis');
 if(s?.type!=='spheres'||!Array.isArray(s.center)||s.center.length!==3||!s.center.every(Number.isFinite)||!Number.isFinite(Number(s.radius))||Number(s.radius)<=0)throw Error('Select a valid sphere');
 const height=width/2,values=[],start=Date.now();let missing=0;
 // Equal-area cylinder: longitude horizontally, sin(latitude) vertically.
 for(let y=0;y<height;y++){
  if(Date.now()-start>60000)throw Error('Sphere probe exceeded 60 seconds');
  const z=1-2*(y+.5)/height,r=Math.sqrt(1-z*z);
  for(let x=0;x<width;x++){
   const phi=2*Math.PI*((x+.5)/width-.5),v=[r*Math.cos(phi),r*Math.sin(phi),z];
   // Cyclic permutations preserve handedness: pole X => longitude zero Y,
   // pole Y => longitude zero Z, pole Z => longitude zero X.
   const direction=poleAxis==='X'?[v[2],v[0],v[1]]:poleAxis==='Y'?[v[1],v[2],v[0]]:v;
   const value=await sampler.sample(direction.map((n,i)=>s.center[i]+Number(s.radius)*n));
   if(value===null||!Number.isFinite(value)){values.push(null);missing++;}else values.push(value);
  }
 }
 return cropProbe({width,height,values,missing,poleAxis});
}
