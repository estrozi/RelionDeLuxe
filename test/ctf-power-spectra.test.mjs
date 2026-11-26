import test from 'node:test';import assert from 'node:assert/strict';import {ctfPowerSpectra} from '../lib/ctf-power-spectra.mjs';
test('CTF power-spectrum constraint follows registered MotionCorr outputs and aliases',async()=>{
 const state={jobs:[{name:'MotionCorr/job002/',alias:'MotionCorr/aligned/',type:1,outputs:['MotionCorr/job002/corrected_micrographs.star']}]};let saved='No';const adapter={call:async()=>({values:{do_save_ps:saved}})};
 for(const input of ['MotionCorr/job002/corrected_micrographs.star','MotionCorr/aligned/corrected_micrographs.star','/project/MotionCorr/job002/corrected_micrographs.star']){const rule=await ctfPowerSpectra('/project',adapter,state,input,1);assert(rule.disabled);assert.match(rule.reason,/job002/);}
 saved='Yes';assert.equal((await ctfPowerSpectra('/project',adapter,state,state.jobs[0].outputs[0],1)).disabled,false);
 saved='No';assert.equal((await ctfPowerSpectra('/project',adapter,state,'elsewhere.star',1)).disabled,true);state.jobs[0].type=2;assert.equal((await ctfPowerSpectra('/project',adapter,state,state.jobs[0].outputs[0],1)).disabled,true);
});
