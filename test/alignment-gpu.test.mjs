import test from 'node:test';
import assert from 'node:assert/strict';
import {settingsStar,validateAlignmentGpu} from '../lib/settings.mjs';
test('AreTomo rejects empty GPU selection before native command generation',()=>{
 const layout={name:'Align tilt-series',label:'relion.aligntiltseries',isTomo:true};
 for(const gpu_ids of ['', '  ',undefined])assert.throws(()=>validateAlignmentGpu(layout,{do_aretomo2:'Yes',gpu_ids}),/gpu_ids, IMOD\/AreTomo2 tab/);
 for(const gpu_ids of ['0','0:1'])assert.doesNotThrow(()=>validateAlignmentGpu(layout,{do_aretomo2:'Yes',gpu_ids}));
 assert.doesNotThrow(()=>validateAlignmentGpu(layout,{do_aretomo2:'No',gpu_ids:''}));
 assert.doesNotThrow(()=>validateAlignmentGpu({name:'3D auto-refine'},{do_aretomo2:'Yes',gpu_ids:''}));
 const schema={options:[{key:'do_aretomo2',type:5,default:'Yes'},{key:'gpu_ids',type:0,default:''}]};
 assert.throws(()=>settingsStar(layout,schema,{}),/must not be empty/);
 assert.match(settingsStar(layout,schema,{gpu_ids:'0'}),/gpu_ids/);
});
