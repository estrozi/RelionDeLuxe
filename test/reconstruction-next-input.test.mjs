import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {nextJobInputs} from '../public/workspace-feed.js';
const target={name:'Reconstruct tomograms'},layout=[{id:55,name:'Align tilt-series'}];
test('reconstruction next-job uses the clicked alignment, including alias output paths',()=>{
 const old={name:'AlignTiltSeries/job005/',type:55,outputs:['AlignTiltSeries/job005/aligned_tilt_series.star']};
 for(const alias of ['None','AlignTiltSeries/best/']){
  const latest={name:'AlignTiltSeries/job013/',type:55,alias,outputs:[(alias==='None'? 'AlignTiltSeries/job013/':alias)+'aligned_tilt_series.star']};
  const seed=nextJobInputs(latest,target,[old,latest],layout);
  assert.deepEqual(seed,{in_tiltseries:'AlignTiltSeries/job013/aligned_tilt_series.star'});
  assert.equal({...{in_tiltseries:old.outputs[0]},...seed}.in_tiltseries,latest.name+'aligned_tilt_series.star');
 }
});
test('delayed automatic defaults preserve the explicit alignment source in the draft',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('const sequentialRequests='),source.indexOf('let extractionRequest='));
 const context={pinnedId:null,copiedDraft:false,workspaceFeed:null,busy:false,selected:null,config:{initialized:true},currentLayout:()=>target,type:56,values:{in_tiltseries:'AlignTiltSeries/job013/aligned_tilt_series.star'},seededInputFields:['in_tiltseries'],loadSerial:1,newDefaults:()=>({in_tiltseries:'AlignTiltSeries/job005/aligned_tilt_series.star'}),state:{jobs:[]},api:async()=>({in_tiltseries:'AlignTiltSeries/job005/aligned_tilt_series.star'}),console};
 vm.createContext(context);vm.runInContext(chunk,context);await vm.runInContext('applySequentialDefaults()',context);
 assert.equal(context.values.in_tiltseries,'AlignTiltSeries/job013/aligned_tilt_series.star');
});
