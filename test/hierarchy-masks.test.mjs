import test from 'node:test';
import assert from 'node:assert/strict';
import {hierarchyConnections,jobConnections} from '../public/job-connections.js';
test('hierarchy omits only retrospective mask edges, including indirect ancestry',()=>{
 for(const type of [9,10]){
  const jobs=[{name:'Refine3D/job001/',type,inputs:['MaskCreate/job003/mask.mrc'],outputs:['Refine3D/job001/map.mrc']},{name:'PostProcess/job002/',type:15,inputs:['Refine3D/job001/map.mrc'],outputs:['PostProcess/job002/map.mrc']},{name:'MaskCreate/job003/',type:12,inputs:['PostProcess/job002/map.mrc'],outputs:['MaskCreate/job003/mask.mrc']}];
  const before=JSON.stringify(jobs);
  assert.equal(jobConnections(jobs).length,3);
  assert.equal(hierarchyConnections(jobs).length,2);
  assert.equal(JSON.stringify(jobs),before);
  jobs[2].inputs=[];
  assert.equal(hierarchyConnections(jobs).length,2);
  assert(hierarchyConnections(jobs).some(e=>e.target===jobs[0].name));
  jobs[2].inputs=['Refine3D/job001/map.mrc'];jobs[2].type=99;
  assert.equal(hierarchyConnections(jobs).length,3);
 }
});
