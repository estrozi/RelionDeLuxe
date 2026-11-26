import test from 'node:test';import assert from 'node:assert/strict';
import {jobProgress} from '../lib/job-progress.mjs';import {ProjectDefaults,initialDefaults} from '../lib/project-defaults.mjs';
test('tilt alignment progress follows the latest RELION dot bar',()=>{
 assert.equal(jobProgress('Align tilt-series','Aligning tilt series ...\n0.40/2.00 min ...........~~(,_,">').fraction,11/60);
 assert.equal(jobProgress('Align tilt-series','Aligning tilt series ...\r1/2 min '+'.'.repeat(30)+'~~(,_,">').fraction,.5);
 assert.equal(jobProgress('Align tilt-series','Aligning tilt series ...\n2/2 min '+'.'.repeat(60)+'~~(,_,"> yum!').fraction,1);
 assert.equal(jobProgress('Align tilt-series','Waiting').fraction,null);
});
test('SBGrid batchruntomo default is isolated and saved overrides prevail',async()=>{
 const sb=new ProjectDefaults('.',true,{sbgrid:true}),local=new ProjectDefaults('.',true);
 assert.equal((await sb.read()).fn_batchtomo_exe,'batchruntomo');
 assert.equal((await local.read()).fn_batchtomo_exe,initialDefaults.fn_batchtomo_exe);
 sb.memory.fn_batchtomo_exe='/custom/batchruntomo';assert.equal((await sb.read()).fn_batchtomo_exe,'/custom/batchruntomo');
});
