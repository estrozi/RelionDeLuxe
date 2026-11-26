import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
test('shared editor saves each pin separately and preserves deferred resources',()=>{
 const received=[];
 function instance(id,diameter){
  const c={pinnedId:id,pinnedTbd:new Set(['nr_threads']),seededInputFields:[],copiedDraft:false,type:10,selected:null,selectedIsContinuation:false,values:{particle_diameter:diameter,nr_threads:'8'},tab:'I/O',$:()=>({value:''}),config:{layout:[{id:10,name:'3D auto-refine'}]},savedJobDefaults:new Map(),embeddedWorkspace:true,workspaceReady:true,workspaceId:'pinned-'+id,window:{parent:{relionPinChanged:(...args)=>received.push(args)}}};
  vm.createContext(c);vm.runInContext(source.slice(source.indexOf('function workspaceSnapshot()'),source.indexOf("import {mountLogPreview}")),c);return c;
 }
 const a=instance('pin1','200'),b=instance('pin2','300');a.values.particle_diameter='210';a.workspaceChanged();b.workspaceChanged();
 assert.equal(received[0][0],'pin1');assert.equal(received[0][1].values.particle_diameter,'210');assert.equal(received[1][1].values.particle_diameter,'300');assert.equal(received[0][1].values.nr_threads,'TBD');
});
test('shared pinned submit routes run/schedule/preview to reviewed pinned workflow, never native direct submission',async()=>{
 const requests=[],c={pinnedId:'pin3',workspaceChanged(){},window:{parent:{relionPinSubmit:(...args)=>requests.push(args)}}};
 vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function submit('),source.indexOf('async function selectJobAfterTask(')),c);
 for(const action of ['run','schedule','preview'])await c.submit(action);
 assert.deepEqual(requests,[['pin3','run'],['pin3','schedule'],['pin3','preview']]);
});
