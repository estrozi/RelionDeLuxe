import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {postprocessNext} from '../lib/postprocess-next.mjs';
import {PinnedDrafts} from '../lib/pinned-drafts.mjs';
import {IdealPipelines} from '../lib/ideal-pipeline.mjs';
test('postprocessing sequence binds current project and converts all nine steps without running jobs',async t=>{
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))),catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
 const type=name=>layout.find(l=>l.name===name).id;
 const jobs=[
 {name:'PostProcess/job021/',type:type('Post-processing'),status:'Succeeded',outputs:['PostProcess/job021/postprocess.star']},
 {name:'Refine3D/job019/',type:type('3D auto-refine'),outputs:['Refine3D/job019/run_data.star','Refine3D/job019/run_class001.mrc'],inputs:['Extract/job004/particles.star']},
 {name:'Extract/job004/',type:type('Particle extraction'),outputs:['Extract/job004/particles.star'],inputs:['MotionCorr/job002/corrected_micrographs.star']},
 {name:'MotionCorr/job002/',type:type('Motion correction'),outputs:['MotionCorr/job002/corrected_micrographs.star'],inputs:[]}
 ];
 const adapter={call:async([a,n])=>a==='state'?{counter:22,jobs,nodes:[]}: {values:n===jobs[0].name?{fn_in:'Refine3D/job019/run_half1_class001_unfil.mrc',fn_mask:'MaskCreate/job020/mask.mrc',fn_mtf:'',angpix:'3.54',mtf_angpix:'0.885'}:{fn_img:'Extract/job004/particles.star',sym_name:'C1',particle_diameter:'212.4'}}};
 const {template}=await postprocessNext(adapter,layout,jobs[0].name,new URL('../templates/postprocess-refinement.json',import.meta.url));
 assert.equal(template.steps.length,9);
 assert.equal(template.steps[1].values.do_4thorder,'No');
 assert.equal(template.steps[1].values.do_tilt,'No');
 assert.equal(template.steps[2].values.do_trefoil,'No');
 assert.equal(template.steps[3].values.fn_mask,'${input:input4}');
 assert.equal(template.steps[3].values.do_solvent_fsc,'Yes');
 assert.equal(template.steps[7].values.fn_ref,'${jobN+3}run_class001.mrc');assert.equal(template.inputs.input6,jobs[3].outputs[0]);assert.equal(template.steps[3].values.sym_name,'C1');assert.equal(template.steps[4].values.angpix,'3.54');assert.equal(template.inputs.input5,'');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'postpins-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const ideal=new IdealPipelines({project,layout,catalog,adapter,defaults:{revision:async()=>1,read:async()=>({}),markSaved(){}},demo:true});
 const store=new PinnedDrafts(ideal);await store.convert(template,0,false);const pins=(await store.state(22)).pins;
 assert.equal(pins.length,9);assert.equal(pins[0].number,22);assert.equal(pins[1].values.fn_data,'${pin1}particles_ctf_refine.star');
 jobs[0].status='Running';await assert.rejects(postprocessNext(adapter,layout,jobs[0].name,''),/finished/);
});
