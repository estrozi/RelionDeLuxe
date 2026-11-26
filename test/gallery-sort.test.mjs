import test from 'node:test';import assert from 'node:assert/strict';
import {compareGalleryRows} from '../public/input-sort.js';
test('particle labels sort by class numerator in both directions, missing last',()=>{
 const rows=['100/1000 particles','9/1000 particles','≈ 20/1000 particles','0/1000 particles','—'].map(NumberOfParticles=>({NumberOfParticles}));
 assert.deepEqual([...rows].sort((a,b)=>compareGalleryRows(a,b,'NumberOfParticles')).map(r=>r.NumberOfParticles),['0/1000 particles','9/1000 particles','≈ 20/1000 particles','100/1000 particles','—']);
 assert.deepEqual([...rows].sort((a,b)=>compareGalleryRows(a,b,'NumberOfParticles',true)).map(r=>r.NumberOfParticles),['100/1000 particles','≈ 20/1000 particles','9/1000 particles','0/1000 particles','—']);
 assert.equal(compareGalleryRows({x:'10'},{x:'2'},'x'),8);
});
