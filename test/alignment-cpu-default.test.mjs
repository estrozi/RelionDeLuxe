import test from 'node:test';
import assert from 'node:assert/strict';
import {alignmentCpuDefault} from '../public/alignment-cpu-default.js';

test('alignment wrapper CPU default follows workstation changes but preserves edits and cluster jobs',()=>{
 const layout={name:'Align tilt-series'},values={other_args:''};
 assert.equal(alignmentCpuDefault(layout,values,{globalNcpus:'12'},false),true);
 assert.equal(values.other_args,'--other_wrapper_args "-cpus localhost:12"');
 assert.equal(alignmentCpuDefault(layout,values,{globalNcpus:'10'},false),true);
 assert.equal(values.other_args,'--other_wrapper_args "-cpus localhost:10"');
 assert.equal(alignmentCpuDefault(layout,values,{globalNcpus:'8'},false,true),false);
 assert.equal(alignmentCpuDefault(layout,values,{globalNcpus:'8'},true),false);
 values.other_args='--other_wrapper_args "-cpus localhost:10" --custom';
 assert.equal(alignmentCpuDefault(layout,values,{globalNcpus:'8'},false),false);
 assert.equal(values.other_args,'--other_wrapper_args "-cpus localhost:10" --custom');
});
