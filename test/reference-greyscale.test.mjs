import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceGreyscaleDefault as suggest} from '../public/input-sort.js';
const layout=[{id:0,name:'Import'},{id:18,name:'3D initial reference'},{id:9,name:'3D classification'},{id:10,name:'3D auto-refine'},{id:16,name:'Post-processing'},{id:99,name:'External'},{id:100,name:'Mask re-scaling',custom:true}];
const jobs=layout.map(l=>({type:l.id,name:l.name.replaceAll(' ','')+'/job'+l.id+'/',outputs:[l.name.replaceAll(' ','')+'/job'+l.id+'/map.mrc']}));
jobs[1].alias='InitialModel/my-reference/';
test('RELION processing maps default to corrected greyscale; imports and external jobs do not',()=>{
 for(const job of jobs)assert.equal(suggest(job.outputs[0],jobs,layout),[0,99,100].includes(job.type)?'No':'Yes');
});
test('aliases, absolute project paths and unlisted class maps identify the source job',()=>{
 for(const file of ['InitialModel/my-reference/run_it200_class001.mrc','/project/3Dinitialreference/job18/map.mrc','./3Dinitialreference/job18/map.mrc'])
  assert.equal(suggest(file,jobs,layout,'/project'),'Yes');
});
test('unknown and out-of-project paths never imply RELION production',()=>{
 for(const file of ['', 'other.mrc','/elsewhere/3Dinitialreference/job18/map.mrc','3Dinitialreference/job18/../../Import/job0/map.mrc','3Dinitialreference/job18/input.star','../3Dinitialreference/job18/map.mrc'])
  assert.equal(suggest(file,jobs,layout,'/project'),'No');
});

test('editor applies the default for both job types while preserving explicit choices and existing jobs',async()=>{
 const fs=await import('node:fs/promises'),vm=await import('node:vm');
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const fn=source.slice(source.indexOf('function applyReferenceGreyscaleDefault(){'),source.indexOf('const samplingInputSignatures='));
 assert(source.includes('applyReferenceGreyscaleDefault();applyAngularSamplingDefault();'));
 for(const name of ['3D classification','3D auto-refine']){
  const control={},context={workspaceFeed:null,selected:null,copiedDraft:false,pinnedId:null,config:{readonly:false,layout,project:'/project'},currentLayout:()=>({name}),editedInputDefaults:new Map(),type:9,values:{fn_ref:jobs[1].outputs[0],ref_correct_greyscale:'No'},state:{jobs},referenceGreyscaleDefault:suggest,$:()=>control,drafts:new Map(),workspaceChanged:()=>{}};
  vm.createContext(context);vm.runInContext(fn,context);
  const run=()=>vm.runInContext('applyReferenceGreyscaleDefault()',context);
  run();assert.equal(context.values.ref_correct_greyscale,'Yes');assert.equal(control.value,'Yes');
  context.values.fn_ref=jobs[0].outputs[0];run();assert.equal(control.value,'No');
  context.values.fn_ref=jobs[1].outputs[0];context.editedInputDefaults.set(9,new Set(['ref_correct_greyscale']));run();assert.equal(context.values.ref_correct_greyscale,'No');
  context.editedInputDefaults.clear();
  for(const guard of ['selected','copiedDraft','pinnedId']){
   context[guard]=true;run();assert.equal(context.values.ref_correct_greyscale,'No');context[guard]=null;
  }
 }
});
