import test from 'node:test';import assert from 'node:assert/strict';
import {moveSupport,excludeRectangle} from '../public/tomo-edit-actions.js';
import {sampleSupports} from '../public/tomo-supports.js';
test('rectangle removes only displayed-depth samples and survives resampling and JSON reload',()=>{
 const supports=[{id:1,type:'particles',tomogram:'A',points:[[0,0,0],[10,0,0],[0,0,20]]},{id:2,type:'particles',tomogram:'B',points:[[0,0,0]]}];
 const item={row:{rlnTomoName:'A'},scale:1,geometry:{axis:'Z',dimensions:[100,100,100],voxelSize:[2,2,2],slice:50}};
 assert.equal(excludeRectangle(supports,sampleSupports(supports),item,[52,52],[48,48],2),1);
 assert.deepEqual(supports[0].excludedSamples,[0]);
 const remaining=sampleSupports(JSON.parse(JSON.stringify(supports)));assert.equal(remaining.length,3);
 assert.ok(remaining.some(p=>p.position[2]===20));assert.ok(remaining.some(p=>p.tomogram==='B'));
 assert.equal(excludeRectangle(supports,remaining,item,[48,48],[52,52],2),0);
});
test('sample exclusions work for generated spheres and persist on support movement',()=>{
 const s={id:1,type:'spheres',tomogram:'A',center:[0,0,0],radius:10,spacing:5};
 const all=sampleSupports([s]);s.excludedSamples=[0,2];assert.equal(sampleSupports([s]).length,all.length-2);
 const before=sampleSupports([s]);moveSupport(s,'Z','right',3);assert.equal(s.center[0],3);
 const after=sampleSupports([s]);assert.equal(after.length,all.length-2);
 assert.deepEqual(after.map(p=>p.sampleIndex),before.map(p=>p.sampleIndex));
 after.forEach((p,i)=>{assert.ok(Math.abs(p.position[0]-before[i].position[0]-3)<1e-8);assert.deepEqual(p.position.slice(1),before[i].position.slice(1));});
 assert.deepEqual(sampleSupports([JSON.parse(JSON.stringify(s))]),after);
});
test('arrows use displayed axes, preserve hidden axis and move all contour vertices',()=>{
 const s={contours:[[[1,2,3],[4,5,6]]],excludedSamples:[2]};
 moveSupport(s,'X','up',2);assert.deepEqual(s.contours[0],[[1,2,1],[4,5,4]]);
 moveSupport(s,'Y','left',3);assert.deepEqual(s.contours[0][0],[-2,2,1]);
 assert.deepEqual(s.excludedSamples,[2]);
 assert.throws(()=>moveSupport(s,'Z','down',0),/positive/);
});

test('keep-only preview is nonmutating and preserves off-slice particles',()=>{
 const supports=[{id:1,excludedSamples:[]}];
 const samples=[{element:1,sampleIndex:0,tomogram:'T',position:[0,0,0]},{element:1,sampleIndex:1,tomogram:'T',position:[3,0,0]},{element:1,sampleIndex:2,tomogram:'T',position:[3,0,4]}];
 const item={row:{rlnTomoName:'T'},scale:1,geometry:{axis:'Z',slice:5,dimensions:[10,10,10],voxelSize:[1,1,1]}};
 assert.deepEqual(excludeRectangle(supports,samples,item,[4,4],[6,6],0,{preview:true}),{keep:1,remove:1});
 assert.deepEqual(supports[0].excludedSamples,[]);
 assert.equal(excludeRectangle(supports,samples,item,[4,4],[6,6],0,{keepOnly:true}),1);
 assert.deepEqual(supports[0].excludedSamples,[1]);
});

test('unified undo restores the last edit including element deletion and ignores no-ops',async()=>{
 const {supportUndo}=await import('../public/tomo-edit-actions.js');
 const initial=[{id:1,points:[[0,0,0]],excludedSamples:[2]}],history=supportUndo(initial);
 const next=structuredClone(initial);next[0].points.push([1,2,3]);history.record(next);history.record(next);
 assert.deepEqual(history.take(),initial);assert.equal(history.available(),false);
 history.record([]);assert.deepEqual(history.take(),initial);
 history.record([{id:2,points:[]}]);assert.deepEqual(history.take(),initial);
});

test('rectangle cleaning and keep-only are restricted to active support',()=>{
 const supports=[{id:1},{id:2}],item={row:{rlnTomoName:'T'},scale:1,geometry:{axis:'Z',slice:5,dimensions:[10,10,10],voxelSize:[1,1,1]}};
 const samples=[1,2].flatMap(element=>[0,3].map((x,sampleIndex)=>({element,sampleIndex,tomogram:'T',position:[x,0,0]})));
 assert.deepEqual(excludeRectangle(supports,samples,item,[4,4],[6,6],0,{preview:true,activeId:1}),{keep:1,remove:1});
 excludeRectangle(supports,samples,item,[4,4],[6,6],0,{keepOnly:true,activeId:1});
 assert.deepEqual(supports[0].excludedSamples,[1]);assert.equal(supports[1].excludedSamples,undefined);
});

test('fit point rectangle selects only visible points, in each view direction',async()=>{
 const {fitPointRectangle}=await import('../public/tomo-edit-actions.js');
 const points=[[0,0,0],[20,0,0],[0,0,20]],item={geometry:{dimensions:[10,10,10],voxelSize:[10,10,10],slice:5,axis:'Z'}};
 assert.deepEqual(fitPointRectangle(points,item,[6,6],[4,4],0),[0]);
 assert.deepEqual(fitPointRectangle(points,item,[4,4],[6,6],2),[0,2]);
 item.geometry.axis='X';assert.deepEqual(fitPointRectangle(points,item,[4,4],[6,6],0),[0]);
 item.geometry.axis='Y';assert.deepEqual(fitPointRectangle(points,item,[4,4],[8,8],0),[0,1,2]);
 assert.deepEqual(points,[[0,0,0],[20,0,0],[0,0,20]]);
});
