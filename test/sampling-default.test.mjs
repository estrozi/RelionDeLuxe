import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {referenceSamplingDefault,referenceResolution} from '../public/input-sort.js';
import {resolutionValue} from '../lib/job-key-info.mjs';
const choices=['30 degrees','15 degrees','7.5 degrees','3.7 degrees','1.8 degrees','0.9 degrees','0.5 degrees','0.2 degrees','0.1 degrees'];
test('select largest available interval satisfying formula, including equality',()=>{
 assert.equal(referenceSamplingDefault(7.30839,212.4,choices).value,'3.7 degrees');
 const d=360/(Math.PI*3.7);
 assert.equal(referenceSamplingDefault(1,d,choices).value,'3.7 degrees');
 assert.equal(referenceSamplingDefault(100,100,choices).value,'7.5 degrees');
 for(const [r,d] of [[null,100],[NaN,100],[999,100],[1,0],[1,-1],[1,10000]])assert.equal(referenceSamplingDefault(r,d,choices),null);
 assert.equal(resolutionValue('3D classification','CurrentResolution= 7.30839 Angstroms'),7.30839);
});
test('new-job defaults update across tabs and respect manual, copied and saved settings',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 let name='3D classification';const input={value:''};
 const context={pinnedId:null,workspaceFeed:null,selected:null,copiedDraft:false,config:{readonly:false,project:'/p'},currentLayout:()=>({name}),editedInputDefaults:new Map(),type:9,
 values:{fn_ref:'Class3D/job001/map.mrc',particle_diameter:'212.4',sampling:'7.5 degrees'},state:{jobs:[{name:'Class3D/job001/',resolutionInfo:'7.31 Å',resolutionAngstrom:7.30839}]},schema:()=>({options:[{key:'sampling',choices}]}),$:()=>input,drafts:new Map(),workspaceChanged(){},referenceResolution,referenceSamplingDefault};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const samplingInputSignatures='),source.indexOf('function showReferenceResolution(){')),context);
 context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'3.7 degrees');assert.equal(input.value,'3.7 degrees');
 name='3D auto-refine';context.values.particle_diameter='100';context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'7.5 degrees');
 context.editedInputDefaults.set(9,new Set(['sampling']));context.values.sampling='0.5 degrees';context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'0.5 degrees');
 context.values.particle_diameter='200';context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'3.7 degrees');
 context.values.ini_high='30';context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'7.5 degrees');
 context.values.sampling='0.5 degrees';
 context.editedInputDefaults.clear();context.selected='Refine3D/job002/';context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'0.5 degrees');
 context.selected=null;context.copiedDraft=true;context.applyAngularSamplingDefault();assert.equal(context.values.sampling,'0.5 degrees');
});

test('low-pass uses the coarser resolution, without offering obsolete choices',()=>{
 assert.equal(referenceSamplingDefault(4,200,choices,10).value,'3.7 degrees');
 assert.equal(referenceSamplingDefault(10,200,choices,4).value,'3.7 degrees');
 assert.equal(referenceSamplingDefault(4,200,choices,-1).value,'1.8 degrees');
 assert.equal(referenceSamplingDefault(4,200,choices,50).value,'7.5 degrees');
});
