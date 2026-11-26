import test from 'node:test';import assert from 'node:assert/strict';import {pipelineJobNumber} from '../public/job-connections.js';
test('divider uses allocated counter, not visible job count',()=>{
 assert.equal(pipelineJobNumber({counter:1,jobs:[]}),0);
 assert.equal(pipelineJobNumber({counter:4,jobs:[{name:'Import/job001/'}]}),3);
 assert.equal(pipelineJobNumber({counter:4,jobs:[]}),3);
 assert.equal(pipelineJobNumber({counter:4,jobs:[{name:'__draft__',provisional:true}]}),3);
 assert.equal(pipelineJobNumber({jobs:[{name:'Import/job007/'}]}),7);
});
