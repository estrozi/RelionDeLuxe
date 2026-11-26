import test from 'node:test';import assert from 'node:assert/strict';import {nextJobInputs} from '../public/workspace-feed.js';
test('tomography Motion correction next subset uses its declared tilt-series output exclusively',()=>{
 for(const status of ['Succeeded','Running','Scheduled']){
  const file='MotionCorr/job004/corrected_tilt_series.star';
  assert.deepEqual(nextJobInputs({status,outputs:[file,'MotionCorr/job004/logfile.pdf']},{name:'Subset selection',mode:'tomo'}),{fn_model:'',fn_mic:file,fn_data:''});
 }
 assert.deepEqual(nextJobInputs({outputs:[]},{name:'Subset selection',mode:'tomo'}),{});
});
test('SPA corrected micrographs and class optimiser inputs are preserved',()=>{
 for(const file of ['MotionCorr/job002/corrected_micrographs.star','CtfFind/job003/micrographs_ctf.star'])assert.equal(nextJobInputs({outputs:[file]},{name:'Subset selection'}).fn_mic,file);
 assert.equal(nextJobInputs({outputs:['Class2D/job005/run_it025_optimiser.star']},{name:'Subset selection'}).fn_model,'Class2D/job005/run_it025_optimiser.star');
});
