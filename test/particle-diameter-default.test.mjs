import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {previousParticleDiameter} from '../lib/particle-diameter-default.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
test('diameter defaults cross job types, ignore future/invalid values, and reach other target types',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'diameter-default-'));
 try{
  const layout=[{id:1,name:'2D classification'},{id:2,name:'3D auto-refine'},{id:3,name:'3D initial reference'},{id:4,name:'Other target'}],state={jobs:[],nodes:[]};
  for(const [number,type,status,value] of [[1,1,'Succeeded','175'],[2,2,'Running','190.5'],[3,1,'Scheduled','300'],[4,2,'Succeeded','-1']]){
   const name='Job/job'+String(number).padStart(3,'0')+'/';state.jobs.push({name,type,status,outputs:[]});await fs.mkdir(path.join(root,name),{recursive:true});await fs.writeFile(path.join(root,name,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nparticle_diameter '+value+'\n');
  }
  assert.deepEqual(await previousParticleDiameter(root,[],state,layout),{diameter:'190.5',sourceJob:'Job/job002/'});
  for(const type of [3,4])assert.deepEqual(await sequentialDefaults(root,[],state,layout,[{id:type,options:[{key:'particle_diameter',type:1,default:'200'}]}],type),{particle_diameter:'190.5'});
  assert.equal(await previousParticleDiameter(root,[],{jobs:[]},layout),null);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
