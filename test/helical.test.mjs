import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';
import {HelicalAdapter,helicalSchema,helicalLayout,addHelicalLayout,validateHelical} from '../lib/helical.mjs';
import {TrashActions,listTrash} from '../lib/trash.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
test('Helical add-on has I/O and Running tabs, six fields, and follows the official initial-reference entry',()=>{
 const l=addHelicalLayout(layout),at=l.findIndex(x=>x.id===helicalLayout.id);
 assert.equal(l[at-1].name,'3D initial reference');assert.equal(l[at].custom,true);assert.deepEqual(Object.keys(l[at].tabs),['I/O','Running']);assert.deepEqual(l[at].tabs.Running,['nr_threads','other_args']);assert(!l[at].tabs['I/O'].includes('nr_threads'));assert.equal(helicalSchema.options.length,6);
 assert.throws(()=>validateHelical({fn_img:'a.star',nr_threads:'1.5'}));assert.throws(()=>validateHelical({fn_img:'a.star',angpix:'0'}));assert.throws(()=>validateHelical({fn_img:'bad;cmd.star'}));
});
test('Helical job uses native External accounting, real launcher arguments, outputs, rerun, abort and Trash',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-helical-'));
 const bin=path.join(project,'bin');await fs.mkdir(bin);
 const executable=path.join(bin,'relion_helix_inimodel2d');
 await fs.writeFile(executable,`#!/usr/bin/env node
const fs=require('node:fs');const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
fs.writeFileSync(get('--pipeline_control')+'arguments.json',JSON.stringify(args));
if(get('--crossover_distance')==='99'){process.exit(7);}
if(get('--crossover_distance')==='88'){setInterval(()=>{},1000);}else{
fs.writeFileSync(get('--o')+'_class001_rec3d.mrc','fixture, not a reconstructed volume');
fs.writeFileSync(get('--pipeline_control')+'RELION_JOB_EXIT_SUCCESS','');}
`,{mode:0o700});
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH};
 const base=new NativeAdapter(project,path.resolve(bridge),env),a=new HelicalAdapter(base);
 try{
  await base.call(['init']);const schemas=await base.call(['schema']),imp=layout.find(l=>l.name==='Import');
  const source=(await base.submit('schedule',imp,schemas.find(s=>s.id===imp.id),{do_raw:'No',do_other:'Yes',fn_in_other:'class_averages.star',node_type:'Multiple (2D or 3D) references (.star or .mrcs)'},'','')).name;
  await fs.writeFile(path.join(project,source,'class_averages.star'),'data_\nloop_\n_rlnReferenceImage #1\n1@classes.mrcs\n');
  const values={fn_img:source+'class_averages.star',angpix:'1.276',mask_diameter:'190',nr_threads:'12',crossover_distance:'11.5',other_args:"--test_option 'two words' --another 3"};
  const preview=await a.submit('preview',helicalLayout,helicalSchema,values,'','');assert.match(preview.command,/--pipeline_control InitialModelHelical\/job002\//);assert.match(preview.command,/--o InitialModelHelical\/job002\/initial_model --iter 1 --sym 1/);assert(!preview.command.includes(' /ini'));assert(preview.command.endsWith(values.other_args));
  assert.equal((await base.call(['state'])).counter,2);
  const job=(await a.submit('schedule',helicalLayout,helicalSchema,values,'','helical_ref')).name;assert.equal(job,'InitialModelHelical/job002/');
  let state=await a.call(['state']),j=state.jobs.find(j=>j.name===job);assert.equal(j.type,1001);assert.equal(j.status,'Scheduled');assert.deepEqual(j.inputs,[values.fn_img]);assert.deepEqual(j.outputs,[job+'initial_model_class001_rec3d.mrc']);assert.equal(state.nodes.find(n=>n.name===values.fn_img).type.split('.')[0],'Image2DGroupMetadata');
  assert.equal((await base.call(['state'])).jobs.find(j=>j.name===job).type,99);
  assert.deepEqual((await new HelicalAdapter(base).call(['job',job])).values,values);
  // Stock bridge execution of the saved External job simulates relion_pipeliner:
  // it requires no new native type and no UI-specific scheduler.
  await base.call(['run',path.join(project,job,'job.star'),job,'']);
  async function waitFor(status){for(let i=0;i<150;i++){const s=await a.call(['refresh']);if(s.jobs.find(j=>j.name===job).status===status)return s;await new Promise(r=>setTimeout(r,30));}throw Error('Timed out: '+status+'\n'+await fs.readFile(path.join(project,job,'run.err'),'utf8')+'\n'+await fs.readFile(path.join(project,job,'run.out'),'utf8'));}
  await waitFor('Succeeded');
  const args=JSON.parse(await fs.readFile(path.join(project,job,'arguments.json')));assert.deepEqual(args,['--i',values.fn_img,'--angpix','1.276','--mask_diameter','190','--j','12','--crossover_distance','11.5','--o',job+'initial_model','--iter','1','--sym','1','--pipeline_control',job,'--test_option','two words','--another','3']);
  assert.equal((await a.call(['state'])).counter,3);
  await a.submit('continue',helicalLayout,helicalSchema,{...values,crossover_distance:'99'},job,'');await waitFor('Failed');
  await a.submit('continue',helicalLayout,helicalSchema,{...values,crossover_distance:'88'},job,'');await a.call(['abort',job]);await waitFor('Aborted');
  assert.equal((await a.call(['state'])).jobs.length,2);
  const trash=new TrashActions(a);const plan=await trash.preview('delete',source,true);assert.equal(plan.jobs.length,2);await trash.execute('delete',plan.id);
  const entries=await listTrash(project);const restore=await trash.preview('restore',entries[0].manifest);await trash.execute('restore',restore.id);
  assert.equal((await a.call(['state'])).jobs.find(j=>j.name===job).type,1001);
  const count=(await a.call(['state'])).counter;await fs.rename(executable,executable+'.disabled');await assert.rejects(a.submit('run',helicalLayout,helicalSchema,values,'',''),/not found/);assert.equal((await a.call(['state'])).counter,count);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
