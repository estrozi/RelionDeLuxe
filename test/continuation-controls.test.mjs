import test from 'node:test';
import assert from 'node:assert/strict';
import {continuationTools,iterationKey,halfValue} from '../public/continuation-controls.js';
test('Classification convenience controls require a completed run and continuation state',()=>{
 const layout={name:'2D classification'},job={name:'Class2D/job001/',status:'Succeeded'},history=new Set();
 assert(continuationTools(layout,job,history));
 assert(continuationTools({name:'3D initial reference'},job,history));
 assert.equal(iterationKey({name:'3D initial reference'}),'nr_iter');
 assert(!continuationTools(layout,null,history));
 assert(!continuationTools(layout,{...job,status:'Failed'},history));
 history.add(job.name);
 assert(continuationTools(layout,{...job,status:'Failed'},history));
 for(const status of ['Running','Scheduled'])assert(!continuationTools(layout,{...job,status},history));
 assert(!continuationTools({name:'3D auto-refine'},job,history));
 assert.equal(iterationKey(layout),'nr_iter_em');assert.equal(iterationKey({name:'3D classification'}),'nr_iter');
});
test('Halving preserves decimal and exponent values and rejects invalid input',()=>{
 assert.equal(halfValue('1.5'),'0.75');assert.equal(halfValue('5'),'2.5');assert.equal(halfValue('1e-3'),'0.0005');assert.equal(halfValue('0'),'0');
 for(const v of ['', 'abc','Infinity','NaN'])assert.throws(()=>halfValue(v));
});
