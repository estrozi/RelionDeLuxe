import test from 'node:test';import assert from 'node:assert/strict';
import {switchedTab} from '../public/workspace-feed.js';import {healthImpact} from '../public/executable-health.js';
test('tab policy preserves within type and resets on type changes',()=>{
 assert.equal(switchedTab({type:4,tab:'Topaz'},{type:4}),'Topaz');
 assert.equal(switchedTab({type:4,tab:'Running'},{type:2,tab:'Running'}),null);
 assert.equal(switchedTab(null,{type:4}),null);
});
test('failed executable tooltips name affected jobs and alignment steps',()=>{
 assert.match(healthImpact('fn_ctffind_exe'),/CTF estimation/);
 assert.match(healthImpact('fn_motioncor2_exe'),/Motion correction/);
 assert.match(healthImpact('fn_resmap'),/Local resolution/);
 assert.match(healthImpact('fn_batchtomo_exe'),/IMOD.*Align tilt-series/);
 assert.match(healthImpact('fn_aretomo_exe'),/AreTomo2.*Align tilt-series/);
});
