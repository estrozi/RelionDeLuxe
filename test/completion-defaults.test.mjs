import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
test('Mask completion refreshes the editor and stale responses cannot restore Running',async()=>{
 const initial={jobs:[{name:'MaskCreate/job001/',status:'Running'}],executableHealth:{}};
 let finishRead,renders=0,inspectors=0;
 const noop=()=>{},element={dataset:{}};
 const context={config:{readonly:false},api:()=>new Promise(resolve=>finishRead=resolve),state:initial,type:9,selected:initial.jobs[0].name,workspaceFeed:null,embeddedWorkspace:true,
 current:()=>context.state.jobs[0],showContinuationTools:()=>false,renderEditor:()=>renders++,renderInspector:()=>inspectors++,$:()=>element,
 syncExecutionMode:noop,workspaceMissing:false,renderTypes:noop,applySequentialDefaults:noop,highlightPendingInputs:noop,showReferenceResolution:noop,applyAngularSamplingDefault:noop,rememberCompletions:noop,renderPipeline:noop,loadLog:noop};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('let stateUpdateSerial='),source.indexOf("$('#refresh').onclick")),context);
 const old=context.update();
 await context.update(false,()=>true,{...initial,jobs:[{...initial.jobs[0],status:'Succeeded'}]});
 assert.equal(renders,1);assert.equal(inspectors,1);
 finishRead(initial);await old;
 assert.equal(context.state.jobs[0].status,'Succeeded');assert.equal(renders,1);
});
function continuationContext(){
 const control={value:''};let calls=0;
 const context={workspaceFeed:null,selected:'Refine3D/job001/',type:10,values:{fn_cont:''},current:()=>({status:'Succeeded'}),currentLayout:()=>({name:'3D auto-refine'}),drafts:new Map(),workspaceChanged(){},$:()=>control,console,URLSearchParams,
 api:async()=>{calls++;return {entries:[{name:'run_it009_optimiser.star',path:'Refine3D/job001/run_it009_optimiser.star',job:'Refine3D/job001/',available:true},{name:'run_it010_optimiser.star',path:'Refine3D/job001/run_it010_optimiser.star',job:'Refine3D/job001/',available:true},{name:'run_it099_optimiser.star',path:'Refine3D/job002/run_it099_optimiser.star',job:'Refine3D/job002/',available:true}]};}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const continuationDefaultAttempts='),source.indexOf('function renderEditor(){')),context);
 return {context,control,calls:()=>calls};
}
test('finished auto-refine defaults to highest available iteration of its own job only',async()=>{
 const {context,control,calls}=continuationContext();await context.applyContinuationDefault();
 assert.equal(context.values.fn_cont,'Refine3D/job001/run_it010_optimiser.star');assert.equal(control.value,context.values.fn_cont);
 context.values.fn_cont='';await context.applyContinuationDefault();assert.equal(calls(),1,'do not repeatedly overwrite an intentionally cleared field');
});
test('continuation default preserves user edits and ignores drafts, running jobs and stale lookups',async()=>{
 for(const setup of [c=>c.values.fn_cont='chosen.star',c=>c.selected=null,c=>c.current=()=>({status:'Running'})]){
  const {context,calls}=continuationContext();setup(context);await context.applyContinuationDefault();assert.equal(calls(),0);
 }
 const {context}=continuationContext();let resolve;context.api=()=>new Promise(r=>resolve=r);
 const pending=context.applyContinuationDefault();context.values.fn_cont='user-chosen.star';resolve({entries:[]});await pending;assert.equal(context.values.fn_cont,'user-chosen.star');
});
