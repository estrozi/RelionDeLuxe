import test from 'node:test';
import assert from 'node:assert/strict';
import {workstationDefaults,pickingGpu} from '../public/workstation-defaults.js';
const schema={options:Object.entries({nr_mpi:'1',nr_threads:'1',use_gpu:'No',gpu_ids:'',do_queue:'No',queuename:'',do_log:'No',do_refs:'Yes',do_topaz:'No',do_own_motioncor:'Yes',scientific:'42'}).map(([key,value])=>({key,default:value}))};
const global={globalNcpus:'12',globalNgpus:'3',gpu_ids:'0:1:2',use_gpu:'Yes',do_queue:'Yes',queuename:'gpu'};
test('workstation save refreshes MPI/threads and direct fields without altering scientific values',()=>{
 const values={do_own_motioncor:'Yes',scientific:'99'};
 const next=workstationDefaults({name:'Motion correction'},schema,values,global);
 assert.equal(next.nr_mpi,'1');assert.equal(next.nr_threads,'12');assert.equal(next.do_queue,'Yes');assert.equal(next.gpu_ids,'0:1:2');
 assert.equal(next.scientific,undefined);assert.equal(values.scientific,'99');
 const external=workstationDefaults({name:'Motion correction'},schema,{do_own_motioncor:'No'},global);
 assert.equal(external.nr_mpi,'3');assert.equal(external.nr_threads,'12');
});
test('LoG cannot inherit GPUs and references use global GPU preference',()=>{
 const layout={name:'Auto-picking'};
 assert.equal(workstationDefaults(layout,schema,{do_log:'Yes',do_refs:'No'},global).use_gpu,'No');
 const values={do_log:'Yes',use_gpu:'Yes'};pickingGpu(layout,values,global);assert.equal(values.use_gpu,'No');
 values.do_log='No';values.do_refs='Yes';pickingGpu(layout,values,global,'do_refs');assert.equal(values.use_gpu,'Yes');
 pickingGpu(layout,values,{use_gpu:'No'},'do_refs');assert.equal(values.use_gpu,'No');
 assert.equal(workstationDefaults(layout,schema,{do_log:'No',do_refs:'Yes'},{...global,use_gpu:'No'}).use_gpu,'No');
});
