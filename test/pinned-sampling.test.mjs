import test from 'node:test';
import assert from 'node:assert/strict';
import {pinnedSamplingDefault} from '../public/pinned-drafts.js';
const layout={name:'3D auto-refine'},schema={options:[{key:'sampling',choices:['30 degrees','15 degrees','7.5 degrees','3.7 degrees','1.8 degrees','0.9 degrees']}]};
const state={jobs:[{name:'Refine3D/job019/',resolutionInfo:'4 Å',resolutionAngstrom:4}],pinned:{committed:{pin1:'Refine3D/job019/'}}};
const values={fn_ref:'Refine3D/job019/run_class001.mrc',particle_diameter:'200',ini_high:'8',sampling:'7.5 degrees'};
test('pinned sampling uses normal formula for all three dependent edits',()=>{
 for(const key of ['fn_ref','particle_diameter','ini_high'])assert.equal(pinnedSamplingDefault(layout,schema,values,state,'',key).value,'3.7 degrees');
 assert.equal(pinnedSamplingDefault(layout,schema,{...values,ini_high:'20'},state,'','ini_high').value,'7.5 degrees');
 assert.equal(pinnedSamplingDefault(layout,schema,{...values,particle_diameter:'400'},state,'','particle_diameter').value,'1.8 degrees');
});
test('manual choices and unrelated edits stay unchanged; symbolic references need measured resolution',()=>{
 assert.equal(pinnedSamplingDefault(layout,schema,values,state,'','sampling'),null);
 assert.equal(pinnedSamplingDefault(layout,schema,values,state,'','nr_threads'),null);
 assert.equal(pinnedSamplingDefault(layout,schema,{...values,fn_ref:'${pin2}map.mrc'},state,'','ini_high'),null);
 assert.equal(pinnedSamplingDefault(layout,schema,{...values,fn_ref:'${pin1}map.mrc'},state,'','ini_high').value,'3.7 degrees');
});
