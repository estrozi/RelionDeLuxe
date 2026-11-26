import test from 'node:test';
import assert from 'node:assert/strict';
import {isMapNode,mapViewerURL} from '../public/map-links.js';
test('Map links distinguish volumes from micrographs and keep credentials in the fragment',()=>{
 for(const type of ['DensityMap.mrc','Mask3D.mrc','DensityMap.mrc.halfmap'])assert(isMapNode('map.mrc',[{name:'map.mrc',type}]));
 assert(!isMapNode('map.mrc',[{name:'map.mrc',type:'Micrograph.mrc'}]));
 assert(!isMapNode('particles.star',[]));
 const url=new URL(mapViewerURL('Refine3D/job003/a #1.mrc','secret','dark'),'http://localhost');
 assert.equal(url.search,'');const fragment=new URLSearchParams(url.hash.slice(1));assert.equal(fragment.get('file'),'Refine3D/job003/a #1.mrc');assert.equal(fragment.get('token'),'secret');
});
