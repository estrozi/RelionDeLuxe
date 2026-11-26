import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';
import {jobInfoEnricher} from '../lib/job-key-info.mjs';
test('mask shortcut follows saved input, only to succeeded refinement with empty saved mask',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mask-next-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source='Refine3D/job001/',mask='MaskCreate/job002/';
 for(const name of [source,mask])await fs.mkdir(path.join(root,name),{recursive:true});
 const settings=(key,value)=>"data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\n"+key+" '"+value+"'\n";
 await fs.writeFile(path.join(root,source,'job.star'),settings('fn_mask',''));
 await fs.writeFile(path.join(root,mask,'job.star'),settings('fn_in','Refine3D/source/run_class001.mrc'));
 const state=()=>({jobs:[{name:mask,type:12,status:'Succeeded',outputs:[mask+'mask.mrc']},{name:source,type:10,status:'Succeeded',alias:'Refine3D/source/',outputs:[source+'run_class001.mrc']}]});
 const enrich=jobInfoEnricher(root,[{id:12,name:'Mask creation'},{id:10,name:'3D auto-refine'},{id:9,name:'3D classification'}]);
 assert.deepEqual((await enrich(state())).jobs[0].maskRefinement,{job:source,mask:mask+'mask.mrc'});
 assert.equal((await enrich(state())).jobs[1].refinementMask,'');
 let s=state();s.jobs[1].status='Running';assert.equal((await enrich(s)).jobs[0].maskRefinement,undefined);
 s=state();s.jobs[1].type=9;assert.equal((await enrich(s)).jobs[0].maskRefinement,undefined);
 s=state();s.jobs[0].status='Running';assert.equal((await enrich(s)).jobs[0].maskRefinement,undefined);
 await fs.writeFile(path.join(root,source,'job.star'),settings('fn_mask','existing.mrc'));assert.equal((await enrich(state())).jobs[0].maskRefinement,undefined);assert.equal((await enrich(state())).jobs[1].refinementMask,'existing.mrc');
});
test('mask continuation fills same refinement and reuses Continue validation',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');let runs=0;
 const job='Refine3D/job001/',mask='MaskCreate/job002/mask.mrc';
 const c={busy:false,config:{readonly:false},selected:job,type:10,values:{fn_mask:'',fn_cont:''},URLSearchParams,drafts:new Map(),renderEditor(){},workspaceChanged(){},$:()=>({onclick:async()=>runs++}),api:async route=>route.startsWith('mask-refinement')?{job,mask}:{entries:[{job,available:true,path:job+'run_it025_optimiser.star'}]}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function continueRefinementWithMask('),source.indexOf('async function continueAutopickManually(')),c);
 await c.continueRefinementWithMask('MaskCreate/job002/');assert.equal(runs,1);assert.equal(c.values.fn_mask,mask);assert.equal(c.values.do_solvent_fsc,'Yes');assert.equal(c.values.fn_cont,job+'run_it025_optimiser.star');assert.equal(c.selected,job);
 await assert.rejects(c.continueRefinementWithMask('MaskCreate/job002/'),/already has a mask/);assert.equal(runs,1);
});
