import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {availableJobTypes} from '../lib/available-job-types.mjs';
test('job types become available only after compatible outputs are produced',async t=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'available-types-'));t.after(()=>fs.rm(project,{recursive:true,force:true}));
 const layout=[{id:1002,name:'Screening'},{id:0,name:'Import'},{id:1,name:'Motion correction'},{id:2,name:'CTF estimation'}];
 const catalog=[{id:1,options:[{key:'input_star_mics',type:3,nodeType:'MicrographMovieGroupMetadata.star',nodeDepth:1,pattern:'*.star'}]},{id:2,options:[{key:'input_star_mics',type:3,nodeType:'MicrographGroupMetadata.star',nodeDepth:1,pattern:'*.star'}]}];
 const state={jobs:[],nodes:[]};assert.deepEqual(await availableJobTypes(project,[],state,layout,catalog),[1002,0]);
 const file='Import/job001/movies.star';state.jobs.push({name:'Import/job001/',type:0,status:'Scheduled',outputs:[file]});state.nodes.push({name:file,type:'MicrographMovieGroupMetadata.star'});
 await fs.mkdir(path.dirname(path.join(project,file)),{recursive:true});await fs.writeFile(path.join(project,file),'data_movies');
 assert.deepEqual(await availableJobTypes(project,[],state,layout,catalog),[1002,0]);state.jobs[0].status='Succeeded';
 assert.deepEqual(await availableJobTypes(project,[],state,layout,catalog),[1002,0,1]);await fs.unlink(path.join(project,file));
 assert.deepEqual(await availableJobTypes(project,[],state,layout,catalog),[1002,0]);
});
