import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {completionMarkers} from '../lib/completion-markers.mjs';
test('scheduled extraction completion is reflected in fresh state; RELION marker precedence is respected and scheduled jobs remain scheduled',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'markers-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const name='Extract/job014/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
 const state=status=>({jobs:[{name,status}]});
 const success=path.join(dir,'RELION_JOB_EXIT_SUCCESS'),settings=path.join(dir,'job.star');
 await fs.writeFile(settings,'settings');
 assert.equal((await completionMarkers(root,state('Running'))).jobs[0].status,'Running');
 await fs.writeFile(success,'');await fs.utimes(success,new Date(Date.now()+1000),new Date(Date.now()+1000));
 assert.equal((await completionMarkers(root,state('Running'))).jobs[0].status,'Succeeded');
 assert.equal((await completionMarkers(root,state('Scheduled'))).jobs[0].status,'Scheduled');
 await fs.writeFile(path.join(dir,'RELION_JOB_EXIT_FAILURE'),'');
 assert.equal((await completionMarkers(root,state('Running'))).jobs[0].status,'Succeeded');
 await fs.unlink(path.join(dir,'RELION_JOB_EXIT_FAILURE'));
 await fs.utimes(success,new Date(0),new Date(0));
 assert.equal((await completionMarkers(root,state('Running'))).jobs[0].status,'Succeeded');
});

test('tomogram reconstruction completion survives a newer job settings timestamp',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-markers-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const name='Tomograms/job006/',dir=path.join(root,name);await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'RELION_JOB_EXIT_SUCCESS'),'');
 await fs.writeFile(path.join(dir,'job.star'),'settings');
 await fs.utimes(path.join(dir,'job.star'),new Date(Date.now()+10000),new Date(Date.now()+10000));
 const state={jobs:[{name,type:56,status:'Running'}]};
 assert.equal((await completionMarkers(root,state)).jobs[0].status,'Succeeded');
});
