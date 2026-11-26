import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {motionDoseDefault} from '../lib/import-angpix-default.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
test('motion dose remains empty until a valid completed job exists',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'motion-dose-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const state={jobs:[],nodes:[]},layout=[{id:1,name:'Motion correction'}],catalog=[{id:1,options:[{key:'dose_per_frame',type:6,default:'1'}]}];
 assert.equal((await sequentialDefaults(project,[],state,layout,catalog,1)).dose_per_frame,undefined);
 async function add(n,value,status){const name=`MotionCorr/job00${n}/`;state.jobs.push({type:1,name,status,outputs:[]});await fs.mkdir(path.join(project,name),{recursive:true});await fs.writeFile(path.join(project,name,'job.star'),`data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndose_per_frame '${value}'\n`);}
 await add(1,'1.25','Scheduled');assert.equal(await motionDoseDefault(project,[],state,1),null);
 state.jobs[0].status='Succeeded';assert.equal((await sequentialDefaults(project,[],state,layout,catalog,1)).dose_per_frame,'1.25');
 await add(2,'2','Failed');await add(3,'','Succeeded');assert.equal(await motionDoseDefault(project,[],state,1),'1.25');
 await add(4,'1.75','Succeeded');assert.equal(await motionDoseDefault(project,[],state,1),'1.75');
});
test('motion draft starts without schema or cached numeric dose defaults',async()=>{
 const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('function newDefaults('),source.indexOf('function applyWorkstation('));
 const ctx={config:{layout:[{id:1,name:'Motion correction'}],catalog:[{id:1,options:[{key:'dose_per_frame',default:'1'}]}]},savedJobDefaults:new Map([[1,{dose_per_frame:'2'}]]),alignmentCpuDefault(){},workstationDefaults:()=>({}),classSelectionDefaults:(_l,_s,v)=>v};vm.createContext(ctx);vm.runInContext(code,ctx);assert.equal(ctx.newDefaults(1).dose_per_frame,'');
});
