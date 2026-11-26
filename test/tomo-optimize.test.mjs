import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {sampleSupports} from '../public/tomo-supports.js';
import {openVoxelSampler,optimizeSupport,sphereProbe} from '../lib/tomo-optimize.mjs';
test('axis search minimizes collective raw values, preserves exclusions, and respects bounds',async()=>{
 const s={id:1,type:'particles',tomogram:'T',points:[[0,0,0],[0,2,0],[99,0,0]],excludedSamples:[2]};
 const r=await optimizeSupport(s,'X',5,{sample:async p=>(p[0]-3)**2+p[1]**2});
 assert.ok(r.improved);assert.ok(Math.abs(r.delta-3)<.05);assert.deepEqual(r.support.excludedSamples,[2]);assert.equal(r.support.points[1][1],2);assert.equal(s.points[0][0],0);
 const b=await optimizeSupport(s,'X',1,{sample:async p=>(p[0]-3)**2});assert.equal(b.delta,1);assert.ok(b.atBoundary);
 const flat=await optimizeSupport(s,'Y',5,{sample:async()=>1});assert.equal(flat.improved,false);assert.equal(flat.delta,0);
 assert.equal((await optimizeSupport(s,'X',5,{sample:async()=>null})).blocked,true);
});
test('sphere radius search improves mean and does not alter center',async()=>{
 const s={id:1,type:'spheres',tomogram:'T',center:[0,0,0],radius:10,spacing:5,excludedSamples:[0]};
 const r=await optimizeSupport(s,'R',5,{sample:async p=>(Math.hypot(...p)-12)**2});
 assert.ok(r.improved);assert.ok(Math.abs(r.support.radius-12)<.05);assert.deepEqual(r.support.center,[0,0,0]);assert.deepEqual(r.support.excludedSamples,[0]);
 const original=sampleSupports([s]),after=sampleSupports([JSON.parse(JSON.stringify(r.support))]);
 assert.equal(after.length,original.length);assert.equal(r.count,original.length);
 for(let i=0;i<after.length;i++){
  assert.equal(after[i].sampleIndex,original[i].sampleIndex);
  assert.deepEqual(after[i].normal,original[i].normal);
  for(let j=0;j<3;j++)assert.ok(Math.abs(after[i].position[j]-original[i].position[j]*r.support.radius/s.radius)<1e-10);
 }
 const again=await optimizeSupport(r.support,'R',5,{sample:async p=>(Math.hypot(...p)-14)**2});
 assert.equal(again.count,original.length);assert.deepEqual(again.support.excludedSamples,[0]);
 assert.equal(again.support.sphereSampleCount,r.support.sphereSampleCount);
 // No candidate may reintroduce the excluded northern-most sample.
 await optimizeSupport(s,'R',5,{sample:async p=>{
  const dir=p[2]/Math.hypot(...p);
  assert.ok(Math.abs(dir-(1-1/(original.length+1)))>1e-8);
  return (Math.hypot(...p)-12)**2;
 }});
 assert.equal(s.sphereSampleCount,undefined);
 await assert.rejects(optimizeSupport({...s,type:'particles'},'R',5,{}),/sphere/);
});
test('raw MRC sampler decodes float16 and trilinearly interpolates with Å spacing',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'optm-'));
 try{
  const b=Buffer.alloc(1024+16);[2,2,2].forEach((n,i)=>{b.writeInt32LE(n,4*i);b.writeInt32LE(n,28+4*i);b.writeFloatLE(4,40+4*i);});b.writeInt32LE(12,12);
  for(let i=0;i<8;i++)b.writeUInt16LE(i%2?0x4200:0x3c00,1024+i*2);
  await fs.writeFile(path.join(root,'a.mrc'),b);const sampler=await openVoxelSampler(root,[],'a.mrc');
  try{assert.equal(await sampler.sample([-2,-2,-2]),1);assert.equal(await sampler.sample([0,-2,-2]),3);assert.equal(await sampler.sample([-1,-1,-1]),2);assert.equal(await sampler.sample([1,0,0]),null);}finally{await sampler.close();}
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('blocked optimization reports all outside indices separately from nonfinite voxels',async()=>{
 const s={id:1,type:'particles',tomogram:'T',points:[[-3,0,0],[0,0,0],[2,0,0],[4,0,0],[8,0,0]],excludedSamples:[4]};
 const sampler={contains:p=>p[0]>=0&&p[0]<=2,sample:async p=>p[0]===2?null:1};
 const r=await optimizeSupport(s,'X',2,sampler);
 assert.equal(r.blocked,true);assert.deepEqual(r.outsideSamples,[]);assert.equal(r.ignoredOutside,2);assert.equal(r.nonFiniteCount,1);
 s.excludedSamples.push(0,3);
 assert.deepEqual(sampleSupports([s]).map(p=>p.sampleIndex),[1,2]);
 const next=await optimizeSupport(s,'X',2,sampler);
 assert.deepEqual(next.outsideSamples,[]);assert.equal(next.nonFiniteCount,1);
});

test('sphere probe samples the radius with equal-area latitude and marks invalid voxels',async()=>{
 const s={type:'spheres',center:[10,20,30],radius:5};let calls=0;
 const r=await sphereProbe(s,{sample:async p=>{
  assert.ok(Math.abs(Math.hypot(...p.map((v,i)=>v-s.center[i]))-5)<1e-10);
  calls++;return p[2]>30?null:p[2];
 }});
 assert.equal(calls,128*64);assert.equal(r.missing,0);assert.equal(r.values.length,calls/2);
 assert.equal(r.domain.y,.5);assert.equal(r.domain.height,.5);assert.equal(r.width,128);assert.equal(r.height,32);assert.ok(r.values[0]<30);assert.ok(r.values.at(-1)<30);
});

test('probe pole axes rotate sampling consistently without changing radius',async()=>{
 const s={type:'spheres',center:[1,2,3],radius:7};
 for(const [axis,index] of [['X',0],['Y',1],['Z',2]]){
  const r=await sphereProbe(s,{sample:async p=>{
   assert.ok(Math.abs(Math.hypot(...p.map((v,i)=>v-s.center[i]))-7)<1e-10);
   return (p[index]-s.center[index])/7;
  }},axis);
  assert.equal(r.poleAxis,axis);
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)assert.ok(Math.abs(r.values[y*r.width+x]-(1-2*(y+.5)/r.height))<1e-10);
 }
 await assert.rejects(sphereProbe(s,{},'invalid'),/pole axis/);
});

test('sphere rotations preserve distances, exclusions and serialization',async()=>{
 const {rotateSphereSupport,sphereProjection}=await import('../public/tomo-supports.js');
 const s={id:1,type:'spheres',tomogram:'T',center:[1,2,3],radius:10,spacing:5,excludedSamples:[0,5]};
 const before=sampleSupports([s]);
 for(const axis of ['X','Y','Z'])for(const d of ['left','up','right','down'])rotateSphereSupport(s,axis,d,5);
 const after=sampleSupports([JSON.parse(JSON.stringify(s))]);
 assert.deepEqual(after.map(p=>p.sampleIndex),before.map(p=>p.sampleIndex));
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
 for(let i=1;i<after.length;i++)assert.ok(Math.abs(distance(after[0].position,after[i].position)-distance(before[0].position,before[i].position))<1e-10);
 for(const p of after)assert.ok(Math.abs(distance(p.position,s.center)-10)<1e-10);
 const r=await optimizeSupport(s,'R',5,{sample:async p=>(distance(p,s.center)-12)**2});
 assert.deepEqual(r.support.sphereRotation,s.sphereRotation);assert.deepEqual(r.support.excludedSamples,[0,5]);
 assert.deepEqual(sphereProjection([11,2,3],s.center,10,'Z'),[.5,.5]);
 const original=JSON.stringify(s.sphereRotation);rotateSphereSupport(s,'Z','right',5);rotateSphereSupport(s,'Z','left',5);
 assert.ok(s.sphereRotation.every((v,i)=>Math.abs(v-JSON.parse(original)[i])<1e-12));
});

test('probe resolution controls actual voxel sampling and rejects excessive requests',async()=>{
 const s={type:'spheres',center:[0,0,0],radius:5};let calls=0;
 const r=await sphereProbe(s,{sample:async()=>{calls++;return 1;}},'Z',256);
 assert.equal(r.width,256);assert.equal(r.height,128);assert.equal(calls,256*128);
 for(const n of [0,129,1026,Infinity])await assert.rejects(sphereProbe(s,{},'Z',n),/width/);
 const {sphereProbeSize}=await import('../public/tomo-view.js');
 assert.deepEqual(sphereProbeSize(256,128),{width:256,height:128});
 assert.deepEqual(sphereProbeSize(600,400),{width:600,height:300});
 assert.deepEqual(sphereProbeSize(600,200),{width:400,height:200});
 assert.deepEqual(sphereProbeSize(2000,2000),{width:1024,height:512});
});

test('explicit sphere sampling and minima survive edits and serialization',async()=>{
 const {freezeSphereSampling,resampleSphere,projectionMinima}=await import('../public/tomo-supports.js');
 const s={id:1,type:'spheres',tomogram:'T',center:[0,0,0],radius:10,spacing:5,excludedSamples:[0]};
 freezeSphereSampling(s);const n=sampleSupports([s]).length;s.radius=20;s.spacing=2;
 assert.equal(sampleSupports([s]).length,n);
 s.sphereDirections=[];assert.equal(sampleSupports([s]).length,0);
 resampleSphere(s);assert.ok(sampleSupports([s]).length>n);
 const values=Array(32).fill(5);values[8]=0;
 const dirs=projectionMinima({width:8,height:4,values,poleAxis:'Z'});assert.equal(dirs.length,1);
 s.sphereDirections=dirs;const p=sampleSupports([JSON.parse(JSON.stringify(s))]);assert.equal(p.length,1);
 assert.ok(Math.abs(Math.hypot(...p[0].position)-20)<1e-10);
 values[15]=-1;assert.equal(projectionMinima({width:8,height:4,values,poleAxis:'Z'}).length,1);
 assert.equal(projectionMinima({width:8,height:4,values:Array(32).fill(5),poleAxis:'Z'}).length,0);
});

test('invert selects maxima and eraser uses screen-pixel swept radius',async()=>{
 const {projectionMinima,withinBrush}=await import('../public/tomo-supports.js');
 const values=Array(32).fill(5);values[9]=0;values[13]=10;
 const image={width:8,height:4,values,poleAxis:'Z'};
 const low=projectionMinima(image),high=projectionMinima(image,true);
 assert.equal(low.length,1);assert.equal(high.length,1);assert.notDeepEqual(low,high);
 assert.equal(withinBrush([50,10],[0,0],[100,0]),true);
 assert.equal(withinBrush([50,10.1],[0,0],[100,0]),false);
 assert.equal(withinBrush([6,8],[0,0],[0,0]),true);
});

test('inverted contrast optimization seeks high raw density as dark values',async()=>{
 const s={id:1,type:'particles',tomogram:'T',points:[[0,0,0]]};
 const r=await optimizeSupport(s,'X',5,{sample:async p=>-((p[0]-3)**2)},true);
 assert.ok(r.improved);assert.ok(Math.abs(r.delta-3)<.05);assert.ok(r.score<r.before);
 const sphere={id:1,type:'spheres',tomogram:'T',center:[0,0,0],radius:10,spacing:5};
 const radius=await optimizeSupport(sphere,'R',5,{sample:async p=>-((Math.hypot(...p)-12)**2)},true);
 assert.ok(Math.abs(radius.support.radius-12)<.05);
});
