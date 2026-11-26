import test from 'node:test';import assert from 'node:assert/strict';
import {alignmentMethods,selectAlignmentMethod,showAlignmentField} from '../public/auto-picking-controls.js';
test('exactly one alignment method and corresponding fields',()=>{
 const v={do_aretomo_ctf:'No',do_aretomo_tiltcorrect:'No'};
 for(const key of alignmentMethods){selectAlignmentMethod(v,key);assert.equal(alignmentMethods.filter(k=>v[k]==='Yes').length,1);assert.equal(showAlignmentField(v,'fiducial_diameter'),key==='do_imod_fiducials');assert.equal(showAlignmentField(v,'tomogram_thickness'),key!=='do_imod_fiducials');assert.equal(showAlignmentField(v,'patch_size'),key==='do_imod_patchtrack');assert.equal(showAlignmentField(v,'gpu_ids'),key==='do_aretomo2');}
 assert.equal(showAlignmentField(v,'aretomo_tiltcorrect_angle'),false);v.do_aretomo_tiltcorrect='Yes';assert.equal(showAlignmentField(v,'aretomo_tiltcorrect_angle'),true);
 assert.equal(showAlignmentField(v,'do_aretomo_phaseshift'),false);v.do_aretomo_ctf='Yes';assert.equal(showAlignmentField(v,'do_aretomo_phaseshift'),true);
});
test('empty and inconsistent method states normalize deterministically',()=>{
 for(const v of [{},Object.fromEntries(alignmentMethods.map(k=>[k,'Yes']))]){selectAlignmentMethod(v);assert.equal(v.do_imod_fiducials,'Yes');assert.equal(alignmentMethods.filter(k=>v[k]==='Yes').length,1);}
});
