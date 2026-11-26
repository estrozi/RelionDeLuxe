import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {modelAngeloMap,compatibleInputs} from '../lib/inputs.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
import {preflight} from '../lib/preflight.mjs';

const masked='PostProcess/job003/postprocess_masked.mrc',local='LocalRes/job004/relion_locres.mrc';
const layout=[{id:15,name:'Post-processing'},{id:16,name:'Local resolution'},{id:23,name:'ModelAngelo building',fields:{}}];
const field={key:'fn_map',default:'',type:3,nodeType:'DensityMap.mrc',nodeDepth:1,pattern:'MRC map files (*.mrc)'};
const catalog=[{id:23,options:[field]}];
const state={jobs:[{name:'PostProcess/job003/',type:15,status:'Succeeded',outputs:[masked,'PostProcess/job003/postprocess.mrc']},{name:'LocalRes/job004/',type:16,status:'Succeeded',outputs:[local]}],nodes:[{name:masked,type:'DensityMap.mrc.relion.postprocess.masked'},{name:local,type:'DensityMap.mrc.relion.localres'}]};
test('ModelAngelo accepts only a declared masked Post-processing map',()=>{
 assert(modelAngeloMap('/project',state,masked));assert(modelAngeloMap('/project',state,'/project/'+masked));
 for(const file of [local,'PostProcess/job003/postprocess.mrc','PostProcess/job009/postprocess_masked.mrc'])assert(!modelAngeloMap('/project',state,file));
});
test('ModelAngelo default and picker exclude newer Local resolution maps',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'model-map-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 assert.deepEqual(await sequentialDefaults(project,[],state,layout,catalog,23),{fn_map:masked});
 const markers=path.join(project,'.Nodes/DensityMap');await fs.mkdir(path.join(markers,'PostProcess/job003'),{recursive:true});await fs.mkdir(path.join(markers,'LocalRes/job004'),{recursive:true});
 for(const name of [masked,local]){await fs.mkdir(path.dirname(path.join(project,name)),{recursive:true});await fs.writeFile(path.join(project,name),'map');await fs.writeFile(path.join(markers,name),'');}
 const found=await compatibleInputs(project,[],{...field,modelAngeloMapOnly:true},state);
 assert.deepEqual(found.entries.map(e=>e.path),[masked]);
});
test('ModelAngelo submission refuses a Local resolution map before native preview',async()=>{
 const adapter={call:async()=>state,submit:async()=>assert.fail('native preview should not run')};
 await assert.rejects(preflight({project:'/project',adapter,layout:layout[2],schema:catalog[0],values:{fn_map:local}}),/Local resolution map cannot be used/);
});
