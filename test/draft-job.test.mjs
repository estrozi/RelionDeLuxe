import test from 'node:test';
import assert from 'node:assert/strict';
import {draftJob,DRAFT_JOB} from '../public/draft-job.js';
import {jobConnections} from '../public/job-connections.js';
test('draft connections change with active inputs, respect aliases, and disappear on submission',()=>{
 const layout=[{id:1,name:'Example',fields:{reference:{when:[{key:'use_ref',value:'Yes'}]}}}];
 const catalog=[{id:1,options:[{key:'input',type:3},{key:'reference',type:3},{key:'qsubscript',type:2}]}];
 const jobs=[{name:'Extract/job005/',alias:'Extract/particles/',outputs:['Extract/job005/particles.star'],inputs:[]},{name:'Select/job006/',alias:'None',outputs:['Select/job006/particles.star'],inputs:[]}];
 const snapshot={type:1,selected:null,values:{input:'Extract/particles/particles.star',reference:'Select/job006/particles.star',use_ref:'No',qsubscript:'Select/job006/script.sh'}};
 let draft=draftJob(snapshot,layout,catalog);assert.deepEqual(draft.inputs,['Extract/particles/particles.star']);
 let edges=jobConnections([...jobs,draft]);assert.equal(edges.length,1);assert.equal(edges[0].source,'Extract/job005/');assert.equal(edges[0].target,DRAFT_JOB);assert.equal(edges[0].provisional,true);
 snapshot.values.input='Select/job006/particles.star';
 draft=draftJob(snapshot,layout,catalog);edges=jobConnections([...jobs,draft]);assert.equal(edges[0].source,'Select/job006/');
 snapshot.values.input='';assert.equal(jobConnections([...jobs,draftJob(snapshot,layout,catalog)]).length,0);
 snapshot.selected='Example/job007/';assert.equal(draftJob(snapshot,layout,catalog),null);
 assert.equal(draftJob(null,layout,catalog),null);assert.equal(jobs.length,2);
});
