import test from 'node:test';
import assert from 'node:assert/strict';
import {groupPending,readinessDecision} from '../lib/scheduler-readiness.mjs';
test('pending stacks group by producer and acknowledgement remains stable while files arrive',()=>{
 const jobs=[{name:'Extract/job089/',outputs:[]}];
 const report=Array.from({length:1000},(_,i)=>({severity:'pending',file:'Extract/job089/Subtomograms/'+i+'.mrcs',message:'missing'}));
 const grouped=groupPending(report,jobs);
 assert.equal(grouped.length,1);assert.match(grouped[0].message,/Waiting for Extract\/job089\//);
 assert.deepEqual(grouped,groupPending(report.slice(500),jobs));
 assert.equal(groupPending([...report,{severity:'warning',file:'external.mrc',message:'missing'}],jobs).length,2);
});
test('readiness waits even if files exist, stops on failure, and validates after success',()=>{
 const check={dependencies:['Extract/job089/'],report:[]};
 assert.deepEqual(readinessDecision(check,[{name:'Extract/job089/',status:'Running'}]),{waiting:['Extract/job089/']});
 for(const status of ['Failed','Aborted','Scheduled'])assert.ok(readinessDecision(check,[{name:'Extract/job089/',status}]).error);
 assert.ok(readinessDecision(check,[]).error);
 assert.deepEqual(readinessDecision(check,[{name:'Extract/job089/',status:'Succeeded'}]),{ready:true});
 check.report.push({severity:'warning',file:'stack.mrcs',message:'file does not exist'});
 assert.match(readinessDecision(check,[{name:'Extract/job089/',status:'Succeeded'}]).error,/stack.mrcs/);
});
