import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
import {compatibleInputs} from '../lib/inputs.mjs';
for(const suffix of ['','-tomo'])test('CTF defaults and browse exclude earlier CTF outputs '+(suffix||'SPA'),async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'ctf-default-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout'+suffix+'.json',import.meta.url))),catalog=JSON.parse(await fs.readFile(new URL('../public/catalog'+suffix+'.json',import.meta.url)));
 const field=catalog.find(s=>s.id===2).options.find(f=>f.key==='input_star_mics');
 const group=field.nodeType.split('.').slice(0,field.nodeDepth).join('.');
 const file=job=>job+(suffix?'corrected_tilt_series.star':'corrected_micrographs.star');
 const jobs=[{name:'MotionCorr/job001/',type:1,status:'Succeeded'},{name:'MotionCorr/job002/',type:1,status:'Succeeded'},{name:'CtfFind/job003/',type:2,status:'Succeeded'}].map(j=>({...j,inputs:[],outputs:[j.type===2?j.name+(suffix?'tilt_series_ctf.star':'micrographs_ctf.star'):file(j.name)]}));
 const state={jobs,nodes:jobs.map(j=>({name:j.outputs[0],type:field.nodeType}))};
 for(const j of jobs){const f=j.outputs[0];for(const p of [path.join(root,f),path.join(root,'.Nodes',group,f)]){await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,'data_\n');}}
 const defaults=await sequentialDefaults(root,[],state,layout,catalog,2);
 assert.equal(defaults.input_star_mics,file('MotionCorr/job002/'));
 const choices=await compatibleInputs(root,[],field,state);assert(choices.entries.every(e=>!e.path.startsWith('CtfFind/')));
 const onlyCTF={...state,jobs:[jobs[2]],nodes:[state.nodes[2]]};
 assert.equal((await sequentialDefaults(root,[],onlyCTF,layout,catalog,2)).input_star_mics,'');
});
