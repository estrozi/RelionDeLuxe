import test from 'node:test';
import assert from 'node:assert/strict';
import {pickingGpu,topazTrainingGpu} from '../public/workstation-defaults.js';
import {settingsStar} from '../lib/settings.mjs';
const layout={name:'Auto-picking',label:'relion.autopick'};
test('Topaz training clears inherited LoG GPU prohibition without requiring IDs',()=>{
 const v={do_topaz:'Yes',do_topaz_train:'Yes',do_log:'No',use_gpu:'No',gpu_ids:''};
 pickingGpu(layout,v,{});assert.equal(v.use_gpu,'Yes');assert.equal(v.gpu_ids,'');
 v.gpu_ids='2';topazTrainingGpu(layout,v);assert.equal(v.gpu_ids,'2');
});
test('native settings enforce training flag for preview, scheduling and execution',()=>{
 const v={do_topaz:'Yes',do_topaz_train:'Yes',use_gpu:'No',gpu_ids:''};
 const schema={options:Object.keys(v).map(key=>({key,type:1}))};
 assert.match(settingsStar(layout,schema,v),/use_gpu 'Yes'/);assert.equal(v.use_gpu,'No');
});
test('Topaz picking remains optional and LoG stays CPU only',()=>{
 const v={do_topaz:'Yes',do_topaz_train:'No',use_gpu:'No'};pickingGpu(layout,v,{});assert.equal(v.use_gpu,'No');
 v.do_topaz='No';v.do_log='Yes';v.use_gpu='Yes';pickingGpu(layout,v,{});assert.equal(v.use_gpu,'No');
});
