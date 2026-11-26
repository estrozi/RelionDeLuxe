import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSupports,constrainSupports,insideVolume,resampleSphere} from '../public/tomo-supports.js';
const geometry={dimensions:[628,628,188],spacing:[10,10,10]};
test('partial sphere never emits outside particles and preserves removed identities across moves',()=>{
 const s={id:1,type:'spheres',tomogram:'T',center:[2144.799,871.434,563.413],radius:3860.825,spacing:75,sphereSampleCount:33301,excludedSamples:[10]};
 constrainSupports([s],{T:geometry});
 const particles=sampleSupports([s]);assert.ok(particles.length>0&&particles.length<4000);assert.ok(particles.every(p=>insideVolume(p.position,geometry)));
 const excluded=new Set(s.excludedSamples);assert.ok(excluded.has(10));
 s.center[0]-=100;constrainSupports([s],{T:geometry});assert.ok([...excluded].every(i=>s.excludedSamples.includes(i)));
 assert.ok(sampleSupports([s]).every(p=>insideVolume(p.position,geometry)));
 resampleSphere(s);constrainSupports([s],{T:geometry});assert.ok(sampleSupports([s]).every(p=>insideVolume(p.position,geometry)));
});
test('loaded points and filament samples are constrained before use, including boundary voxels',()=>{
 const g={dimensions:[10,10,10],spacing:[10,10,10]},s={id:1,type:'particles',tomogram:'T',points:[[-50,0,0],[40,0,0],[40.001,0,0],[NaN,0,0]]};
 s.points.pop();constrainSupports([s],{T:g});assert.deepEqual(sampleSupports([s]).map(p=>p.sampleIndex),[0,1]);
 const f={id:2,type:'filaments',tomogram:'T',spacing:10,points:[[-100,0,0],[100,0,0]]};constrainSupports([f],{T:g});assert.equal(sampleSupports([f]).length,10);
 const unfinished={id:3,type:'filaments',tomogram:'T',spacing:10,points:[[0,0,0]]};assert.doesNotThrow(()=>constrainSupports([unfinished],{T:g}));
});
