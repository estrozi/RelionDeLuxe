import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedVolume,exceedsSurfaceBudget} from '../public/surface-budget.js';
test('small maps remain unchanged and level affects the budget',()=>{
 const data=new Float32Array([0,1,0,1,0,1,0,1]);
 assert.equal(exceedsSurfaceBudget(data,2,2,2,.5,14),true);
 assert.equal(exceedsSurfaceBudget(data,2,2,2,2,14),false);
 assert.equal(boundedVolume({data,nx:2,ny:2,nz:2},.5).data,data);
});
test('dense maps are averaged down without changing the original',()=>{
 const n=100,data=new Float32Array(n**3);for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++)data[x+n*(y+n*z)]=(x+y+z)%2;
 const reduced=boundedVolume({data,nx:n,ny:n,nz:n},.4);
 assert.equal(reduced.factor,2);assert.equal(reduced.nx,50);assert.equal(reduced.data[0],.5);assert.equal(data[0],0);
 assert.equal(exceedsSurfaceBudget(reduced.data,50,50,50,.4),false);
});
