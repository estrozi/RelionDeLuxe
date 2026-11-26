import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {unusedPickingInputs} from '../public/auto-picking-controls.js';
import {configurationFix} from '../lib/configuration-fixes.mjs';
import {draftJob} from '../public/draft-job.js';
import {inactiveCaptureInputs} from '../lib/ideal-pipeline.mjs';
const layouts=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))),catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
const layout=layouts.find(l=>l.name==='Auto-picking'),schema=catalog.find(s=>s.id===layout.id);
const files={fn_refs_autopick:'Class2D/job001/classes.star',fn_ref3d_autopick:'Refine3D/job002/map.mrc',topaz_model:'AutoPick/job003/model.sav',topaz_train_parts:'Extract/job004/particles.star',topaz_train_picks:'ManualPick/job005/manualpick.star'};
for(const [name,flags,used] of [
 ['LoG',{do_log:'Yes'},[]],
 ['2D refs',{do_refs:'Yes'},['fn_refs_autopick']],
 ['3D refs',{do_refs:'Yes',do_ref3d:'Yes'},['fn_ref3d_autopick']],
 ['Topaz pick',{do_topaz:'Yes',do_topaz_pick:'Yes'},['topaz_model']],
 ['Topaz train particles',{do_topaz:'Yes',do_topaz_train:'Yes',do_topaz_train_parts:'Yes'},['topaz_train_parts']],
 ['Topaz train coordinates',{do_topaz:'Yes',do_topaz_train:'Yes'},['topaz_train_picks']]
]){
 test(name+' ignores unused dependencies and proposes clearing only unused paths',()=>{
  const values={do_log:'No',do_refs:'No',do_topaz:'No',do_ref3d:'No',do_topaz_pick:'No',do_topaz_train:'No',do_topaz_train_parts:'No',...files,...flags,fn_input_autopick:'MotionCorr/job006/micrographs.star'};
  const unused=unusedPickingInputs(layout,values),fix=configurationFix(layout,schema,values);
  assert.deepEqual(Object.keys(fix.changes).sort(),Object.keys(files).filter(k=>!used.includes(k)).sort());
  assert.equal(fix.configurationWarning,true);assert.equal(values.topaz_model,files.topaz_model);
  const cleared={...values,...fix.changes};assert.equal(configurationFix(layout,schema,cleared),null);
  const draft=draftJob({type:layout.id,values},layouts,catalog);
  for(const key of unused){assert(!draft.inputs.includes(files[key]));assert(inactiveCaptureInputs(layout,schema,values).has(key));}
  for(const key of used){assert(draft.inputs.includes(files[key]));assert.equal(cleared[key],files[key]);}
  assert(draft.inputs.includes(values.fn_input_autopick));
 });
}
