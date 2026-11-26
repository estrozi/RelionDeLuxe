import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
const catalog=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url)));
test('Subset selection chooses one newest input including declared pending outputs without markers',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pending-default-'));
 try{
  const state={jobs:[],nodes:[]};
  async function add(name,status,files){
   state.jobs.push({name,status,outputs:files.map(f=>name+f[0])});
   for(const [suffix,group] of files){
    const file=name+suffix;state.nodes.push({name:file,type:group+'.star.relion'});
    if(status==='Succeeded')for(const p of [file,'.Nodes/'+group+'/'+file]){await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),'');}
   }
  }
  await add('AutoPick/job003/','Succeeded',[['micrographs_selected.star','MicrographGroupMetadata']]);
  await add('Extract/job005/','Succeeded',[['particles.star','ParticleGroupMetadata']]);
  assert.deepEqual(await sequentialDefaults(root,[],state,layout,catalog,7),{fn_data:'Extract/job005/particles.star',fn_mic:'',fn_model:''});
  await add('Class2D/job006/','Running',[['run_it025_optimiser.star','OptimiserData'],['run_it025_data.star','ParticleGroupMetadata']]);
  for(const status of ['Running','Scheduled']){
   state.jobs.at(-1).status=status;
   assert.deepEqual(await sequentialDefaults(root,[],state,layout,catalog,7),{fn_data:'',fn_mic:'',fn_model:'Class2D/job006/run_it025_optimiser.star'});
  }
  state.jobs.at(-1).status='Failed';
  assert.equal((await sequentialDefaults(root,[],state,layout,catalog,7)).fn_data,'Extract/job005/particles.star');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('draft replaces stale alternative defaults atomically but preserves explicit user choices',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('const sequentialRequests='),source.indexOf('let extractionRequest='));
 for(const edited of [false,true]){
  const values={fn_model:'',fn_mic:'old-mics.star',fn_data:'old-particles.star'};
  const context={seededInputFields:[],pinnedId:null,copiedDraft:false,workspaceFeed:null,busy:false,selected:null,config:{initialized:true},currentLayout:()=>({name:'Subset selection'}),type:7,values,loadSerial:1,newDefaults:()=>({fn_model:'',fn_mic:'',fn_data:''}),state:{jobs:[]},api:async()=>({fn_model:'Class2D/job006/run_it025_optimiser.star',fn_mic:'',fn_data:''}),schema:()=>({options:[]}),classSelectionDefaults(){},drafts:new Map(),renderEditor(){},applyMaskDefault(){},workspaceChanged(){},console};
  vm.createContext(context);vm.runInContext(chunk,context);
  if(edited)vm.runInContext("editedInputDefaults.set(7,new Set(['fn_data']))",context);
  await vm.runInContext('applySequentialDefaults()',context);
  assert.equal(values.fn_model,edited?'':'Class2D/job006/run_it025_optimiser.star');
  assert.equal(values.fn_data,edited?'old-particles.star':'');
  assert.equal(values.fn_mic,edited?'old-mics.star':'');
 }
});

test('delayed defaults cannot replace next-job optimiser, including after workspace snapshot transfer',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const chunk=source.slice(source.indexOf('const sequentialRequests='),source.indexOf('let extractionRequest='));
 const seed=structuredClone({seededInputFields:['fn_model','fn_mic','fn_data'],values:{fn_model:'Class3D/job028/run_it025_optimiser.star',fn_mic:'',fn_data:''}});
 let release;
 const context={...seed,pinnedId:null,copiedDraft:false,workspaceFeed:null,busy:false,selected:null,config:{initialized:true},currentLayout:()=>({name:'Subset selection'}),type:7,loadSerial:1,newDefaults:()=>({}),state:{jobs:[]},api:()=>new Promise(resolve=>release=resolve),schema:()=>({options:[]}),classSelectionDefaults(){},drafts:new Map(),renderEditor(){},applyMaskDefault(){},workspaceChanged(){},console};
 vm.createContext(context);vm.runInContext(chunk,context);
 const pending=vm.runInContext('applySequentialDefaults()',context);
 release({fn_model:'',fn_mic:'AutoPick/job003/micrographs_selected.star',fn_data:''});
 await pending;
 assert.deepEqual(context.values,seed.values);
 assert.equal(context.values.fn_model,'Class3D/job028/run_it025_optimiser.star');
 assert.equal(context.values.fn_mic,'');
 assert.match(source,/seededInputFields=\[\.\.\.\(seed.seededInputFields\|\|\[\]\)\]/);
});
