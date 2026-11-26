import test from 'node:test';import assert from 'node:assert/strict';
import {jobConnections} from '../public/job-connections.js';
test('dependency links group files, resolve aliases and preserve branches, cycles and failures',()=>{
 const jobs=[{name:'A/job001/',alias:'A/source/',outputs:['A/job001/a.star','A/job001/b.mrc'],inputs:['B/job002/mask.mrc']},{name:'B/job002/',alias:'None',status:'Failed',inputs:['A/source/a.star','A/job001/b.mrc'],outputs:['B/job002/mask.mrc']},{name:'C/job003/',status:'Succeeded',inputs:['A/job001/a.star','external.star'],outputs:[]}];
 const edges=jobConnections(jobs);assert.equal(edges.length,3);const e=edges.find(e=>e.target==='B/job002/');assert.equal(e.files.length,2);assert.equal(e.status,'Failed');assert.ok(edges.some(e=>e.source==='B/job002/'&&e.target==='A/job001/'));assert.ok(edges.some(e=>e.target==='C/job003/'));
});
test('postprocess input resolves its producer even with an omitted output node',()=>{
 const edges=jobConnections([{name:'PostProcess/job021/',alias:'PostProcess/final/',outputs:[]},{name:'CtfRefine/job022/',inputs:['PostProcess/final/postprocess.star']},{name:'Polish/job023/',inputs:['PostProcess/job021/postprocess.star']}]);
 assert.equal(edges.length,2);assert.ok(edges.every(e=>e.source==='PostProcess/job021/'));
});

test('full-path focus follows ancestors and descendants without leaking into sibling branches',async()=>{
 const {connectionFocus}=await import('../public/job-connections.js');
 const edges=[['A','B'],['B','C'],['C','D'],['A','Sibling'],['Other','D'],['X','Y']].map(([source,target])=>({source,target}));
 const direct=connectionFocus(edges,'C');assert.deepEqual(edges.filter(direct.connected).map(e=>e.source+e.target),['BC','CD']);
 const full=connectionFocus(edges,'C',true);assert.deepEqual(edges.filter(full.connected).map(e=>e.source+e.target),['AB','BC','CD']);assert.deepEqual([...full.related].sort(),['A','B','C','D']);
 assert.equal(edges.filter(connectionFocus(edges,null,true).connected).length,edges.length);
 const cycle=[...edges,{source:'D',target:'B'},{source:'C',target:'C'}];assert(connectionFocus(cycle,'C',true).connected(cycle.at(-1)));
});
test('only repeated unmodified single-row selection toggles full-path focus',async()=>{
 const {nextConnectionFocus}=await import('../public/job-connections.js');const selected=new Set(['B']);
 assert.equal(nextConnectionFocus(null,selected,'B',{}),'B');assert.equal(nextConnectionFocus('B',selected,'B',{}),null);
 assert.equal(nextConnectionFocus('B',selected,'C',{}),null);
 for(const key of ['ctrlKey','metaKey','shiftKey'])assert.equal(nextConnectionFocus('B',selected,'B',{[key]:true}),null);
 assert.equal(nextConnectionFocus(null,new Set(['A','B']),'B',{}),null);
});
