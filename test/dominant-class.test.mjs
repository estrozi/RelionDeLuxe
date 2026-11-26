import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {dominantInput,DominantAdapter,copyDominantMap} from '../lib/dominant-class.mjs';import {NativeAdapter} from '../lib/native.mjs';
test('dominant 3D model follows optimiser and resolves ties by class number',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-'));try{await fs.writeFile(path.join(p,'opt.star'),'data_optimiser_general\n_rlnModelStarFile model.star\n_rlnExperimentalDataStarFile data.star\n');await fs.writeFile(path.join(p,'model.star'),'data_model_general\n_rlnReferenceDimensionality 3\ndata_model_classes\nloop_\n_rlnClassDistribution #1\n0.1\n0.45\n0.45\n');const r=await dominantInput(p,[],'opt.star');assert.equal(r.is3D,true);assert.equal(r.winner.id,2);assert.equal(r.ties,2);assert.equal(r.data,'data.star');}finally{await fs.rm(p,{recursive:true,force:true});}});
test('dominant option translates to a schedulable External job and reads back as selection',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-native-'));try{const native=new NativeAdapter(p,process.env.RELION_DELUXE_BRIDGE);await native.call(['init']);const a=new DominantAdapter(native,p,[]),s=(await a.call(['schema'])).find(s=>s.id===7),l={id:7,label:'relion.select'},v={...Object.fromEntries(s.options.map(f=>[f.key,f.default])),fn_model:'Class3D/job001/run_it025_optimiser.star',do_class_ranker:'No',do_dominant_3d:'Yes',do_queue:'No'};const preview=await a.submit('preview',l,s,v);assert.match(preview.command,/dominant-class-runner/);const result=await a.submit('schedule',l,s,v);const job=await a.call(['job',result.name]);assert.equal(job.type,7);assert.equal(job.values.do_dominant_3d,'Yes');assert.equal(job.values.fn_model,v.fn_model);assert.equal((await a.call(['state'])).jobs[0].type,7);}finally{await fs.rm(p,{recursive:true,force:true});}});

test('dominant map is copied with iteration filename and identical bytes',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'dominant-map-'));try{await fs.mkdir(path.join(p,'External/job002'),{recursive:true});const bytes=Buffer.from([0,1,2,255]);await fs.writeFile(path.join(p,'run_it025_class003.mrc'),bytes);const target=await copyDominantMap(p,[],{model:'Class3D/job001/run_it025_model.star',winner:{map:'run_it025_class003.mrc'}},path.join(p,'External/job002'));assert.equal(path.basename(target),'run_it025_dominantclass.mrc');assert.deepEqual(await fs.readFile(target),bytes);await assert.rejects(copyDominantMap(p,[],{model:'run_model.star',winner:{}},path.join(p,'External/job002')),/rlnReferenceImage/);}finally{await fs.rm(p,{recursive:true,force:true});}});

test('STA layout and adapter expose dominant selection and route it to External',async()=>{
 const {CryocareAdapter}=await import('../lib/cryocare.mjs');
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout-tomo.json',import.meta.url),'utf8'));
 assert.ok(layout.find(l=>l.id===7).tabs['Class options'].includes('do_dominant_3d'));
 let submission;
 const base={env:{MODE:'tomo'},call:async()=>[{id:7,options:[]},{id:99,options:[]}],submit:async(...args)=>{submission=args;return {inputs:[]};}};
 const adapter=new DominantAdapter(new CryocareAdapter(base),'/project',[]);
 const schema=(await adapter.call(['schema'])).find(s=>s.id===7);
 assert.ok(schema.options.some(o=>o.key==='do_dominant_3d'));
 await adapter.submit('schedule',{id:7},schema,{fn_model:'Class3D/job001/run_it025_optimiser.star',do_dominant_3d:'Yes'});
 assert.equal(submission[1].id,99);
 assert.equal(submission[3].in_part,'Class3D/job001/run_it025_optimiser.star');
 assert.match(submission[3].fn_exe,/dominant-class-runner/);
 assert.equal(adapter.env.MODE,'tomo');
});
