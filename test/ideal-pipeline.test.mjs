import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {IdealPipelines,validateTemplate,resolveValues} from '../lib/ideal-pipeline.mjs';
import {NativeAdapter} from '../lib/native.mjs';
import {ProjectDefaults} from '../lib/project-defaults.mjs';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))),catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
const ext=layout.find(l=>l.name==='External');
const template=()=>({format:'RelionDeLuxe.ideal-pipeline',version:1,name:'Example',inputs:{data:'input.star'},steps:[{id:'jobN+1',type:ext.label,directory:'External',values:{fn_exe:'/bin/true',in_part:'${jobN}particles.star'}},{id:'jobN',type:ext.label,directory:'External',values:{fn_exe:'/bin/true',in_part:'${input:data}'}}]});
test('Ideal templates sort dependencies, preserve symbolic references and reject invalid graphs',()=>{
 const t=validateTemplate(template(),layout,catalog);assert.deepEqual(t.steps.map(s=>s.id),['jobN','jobN+1']);
 assert.equal(resolveValues(t.steps[1],t.inputs,{jobN:'External/job053/' }).in_part,'External/job053/particles.star');
 const cycle=template();cycle.steps[1].values.in_part='${jobN+1}data.star';assert.throws(()=>validateTemplate(cycle,layout,catalog),/Cycle/);
 const missing=template();missing.steps[0].values.in_part='${jobN+9}data.star';assert.throws(()=>validateTemplate(missing,layout,catalog),/Unknown step/);
 const input=template();input.inputs={};assert.throws(()=>validateTemplate(input,layout,catalog),/Unbound/);
 const duplicate=template();duplicate.steps[1].id='jobN+1';assert.throws(()=>validateTemplate(duplicate,layout,catalog),/unique/);
 const cont=template();cont.steps[1].values.fn_cont='old.star';assert.throws(()=>validateTemplate(cont,layout,catalog),/fresh jobs/);
 assert.throws(()=>validateTemplate({},layout,catalog),/STAR alone/);
});
const bridge=process.env.RELION_DELUXE_BRIDGE;
test('Native ideal batch previews without mutation, schedules remapped dependencies, rejects stale plans and captures settings',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'ideal-native-'));const adapter=new NativeAdapter(project,path.resolve(bridge)),defaults=new ProjectDefaults(project);
 const service=new IdealPipelines({project,adapter,layout,catalog,defaults});
 try{
  await adapter.call(['init']);await fs.writeFile(path.join(project,'input.star'),'data_particles\nloop_\n_rlnImageName #1\na.mrcs\n');
  const p=await service.preview(template());assert.equal((await adapter.call(['state'])).jobs.length,0);assert.equal(p.items[1].values.in_part,'External/job001/particles.star');assert.ok(p.report.some(r=>r.severity==='pending'));
  const result=await service.execute(p.id);assert.deepEqual(result.created,['External/job001/','External/job002/']);assert.equal((await adapter.call(['job',result.created[1]])).values.in_part,'External/job001/particles.star');assert.ok((await adapter.call(['state'])).jobs.every(j=>j.status==='Scheduled'));
  const capture=await service.capture(result.created);assert.equal(capture.template.steps[1].values.in_part,'${jobN}particles.star');validateTemplate(capture.template,layout,catalog);const reversed=await service.capture([...result.created].reverse());assert.deepEqual(reversed.template.steps.map(s=>s.id),['jobN','jobN+1']);assert.equal(reversed.template.steps[1].values.in_part,'${jobN}particles.star');
  const roundtrip=await service.preview(JSON.parse(JSON.stringify(capture.template)));assert.equal(roundtrip.items[1].values.in_part,'External/job003/particles.star');
  await defaults.write({nr_threads:'7'});await assert.rejects(service.execute(roundtrip.id),/settings changed/);
  const fresh=await service.preview(capture.template);assert.equal(fresh.items[0].values.nr_threads,'7');
  await fs.writeFile(path.join(project,'RUNNING_PIPELINER_test'),'');await assert.rejects(service.execute(fresh.id),/Stop the active scheduler/);await fs.unlink(path.join(project,'RUNNING_PIPELINER_test'));
  await adapter.call(['mark-failed',result.created[0]]);await assert.rejects(service.capture(result.created),/successful or scheduled/);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Partial batch failure reports concrete creations and leaves originals intact',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'ideal-partial-')),base=new NativeAdapter(project,path.resolve(bridge));let count=0;
 const adapter={call:a=>base.call(a),submit:(action,...args)=>{if(action==='schedule'&&++count===2)throw Error('Injected failure');return base.submit(action,...args);}};
 const service=new IdealPipelines({project,adapter,layout,catalog,defaults:new ProjectDefaults(project)});
 try{await base.call(['init']);const p=await service.preview(template());await assert.rejects(service.execute(p.id),/Created scheduled jobs: External\/job001/);assert.equal((await base.call(['state'])).jobs.length,1);}finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Native ideal batch can plan and register the helical add-on after class-average selection',{skip:!bridge},async()=>{
 const {HelicalAdapter,helicalSchema,addHelicalLayout}=await import('../lib/helical.mjs');
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'ideal-helical-')),base=new NativeAdapter(project,path.resolve(bridge)),adapter=new HelicalAdapter(base);
 const layouts=addHelicalLayout(layout),schemas=[...catalog,helicalSchema],service=new IdealPipelines({project,adapter,layout:layouts,catalog:schemas,defaults:new ProjectDefaults(project)});
 const t={format:'RelionDeLuxe.ideal-pipeline',version:1,name:'Helix',inputs:{model:'Class2D/job099/run_it025_model.star'},steps:[{id:'jobN',directory:'Select',type:'relion.select',values:{fn_model:'${input:model}'}},{id:'jobN+1',directory:'InitialModelHelical',type:'relion.external.initialmodelhelical',values:{fn_img:'${jobN}class_averages.star'}}]};
 try{await base.call(['init']);const p=await service.preview(t);const result=await service.execute(p.id);assert.deepEqual(result.created,['Select/job001/','InitialModelHelical/job002/']);assert.equal((await adapter.call(['job',result.created[1]])).values.fn_img,'Select/job001/class_averages.star');}finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Capture omits inactive Import paths and replaces all queue paths with portable resources',async()=>{
 const imp=layout.find(l=>l.name==='Import'),motion=layout.find(l=>l.name==='Motion correction');
 const jobs=[{name:'Import/job001/',type:imp.id,status:'Succeeded'}, {name:'MotionCorr/job002/',type:motion.id,status:'Succeeded'}];
 const saved={
  'Import/job001/':{do_raw:'Yes',do_other:'No',fn_in_raw:'Movies/*.tiff',fn_in_other:'ref.mrc',do_queue:'No',qsubscript:'/cluster/qsub.csh'},
  'MotionCorr/job002/':{input_star_mics:'Import/job001/movies.star',do_queue:'Yes',qsubscript:'/cluster/qsub.csh'}
 };
 const adapter={call:async([action,name])=>action==='state'?{jobs}:{type:jobs.find(j=>j.name===name).type,values:saved[name]}};
 const service=new IdealPipelines({project:'/project',adapter,layout,catalog,defaults:{forJob:async(_,v)=>v}});
 let result=await service.capture(jobs.map(j=>j.name)),t=result.template;
 assert.equal(t.steps[0].values.fn_in_other,'');assert.equal(t.steps[0].values.qsubscript,'TBD');
 assert(!Object.values(t.inputs).includes('ref.mrc'));assert(!Object.values(t.inputs).includes('/cluster/qsub.csh'));
 assert.equal(t.steps[1].values.qsubscript,'TBD');assert.equal(t.steps[1].values.input_star_mics,'${jobN}movies.star');
 saved['MotionCorr/job002/'].do_queue='No';t=(await service.capture(jobs.map(j=>j.name))).template;
 assert(!Object.values(t.inputs).includes('/cluster/qsub.csh'));assert.equal(t.steps[1].values.qsubscript,'TBD');
 saved['Import/job001/'].do_raw='No';saved['Import/job001/'].do_other='Yes';saved['Import/job001/'].fn_in_raw='Import/job001/stale.star';
 t=(await service.capture(['Import/job001/'])).template;assert.equal(t.steps[0].values.fn_in_raw,'');assert(Object.values(t.inputs).includes('ref.mrc'));assert.deepEqual(t.steps[0].dependencies,[]);
 assert.equal(saved['Import/job001/'].fn_in_raw,'Import/job001/stale.star'); // Capture never edits saved settings.
});

test('Capture activation follows nested conditions and defaults, not continuation edit locks',async()=>{
 const {inactiveCaptureInputs}=await import('../lib/ideal-pipeline.mjs');
 const l={fields:{child:{when:[{key:'parent',value:'Yes'}]},file:{when:[{key:'child',value:'Yes'}]},locked:{toggle:'TOGGLE_DEACTIVATE'}}};
 const s={options:[{key:'parent',type:5,default:'No'},{key:'child',type:5,default:'Yes'},{key:'file',type:2,default:'unused.mrc'},{key:'locked',type:3,default:'particles.star'},{key:'qsubscript',type:2,default:'submit.csh'},{key:'do_queue',type:5,default:'No'}]};
 assert.deepEqual([...inactiveCaptureInputs(l,s,{})],['file','qsubscript']);
 assert.deepEqual([...inactiveCaptureInputs(l,s,{parent:'Yes',do_queue:'Yes'})],[]);
});
