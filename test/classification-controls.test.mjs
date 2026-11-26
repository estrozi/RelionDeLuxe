import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClassification,showClassificationField,ctfAlwaysOn} from '../public/classification-controls.js';
import {workstationDefaults} from '../public/workstation-defaults.js';
test('CTF correction stays enabled and omitted for the four refinement types',()=>{
 for(const name of ctfAlwaysOn){const v={do_ctf_correction:'No'};normalizeClassification({name},v);assert.equal(v.do_ctf_correction,'Yes');assert.equal(showClassificationField({name},v,'do_ctf_correction'),false);}
 assert.equal(showClassificationField({name:'Import'},{},'do_ctf_correction'),true);
});
test('2D method selection, dependent visibility and MPI rules',()=>{
 const l={name:'2D classification',fields:{nr_iter_em:{when:[{key:'do_em',value:'Yes'}]},nr_iter_grad:{when:[{key:'do_grad',value:'Yes'}]}}};
 const v={do_em:'Yes',do_grad:'Yes',nr_mpi:'9'};normalizeClassification(l,v);
 assert.equal(v.do_em,'No');assert.equal(v.nr_mpi,'1');assert.equal(showClassificationField(l,v,'nr_iter_em'),false);assert.equal(showClassificationField(l,v,'nr_iter_grad'),true);
 v.do_grad='No';normalizeClassification(l,v);assert.equal(v.do_em,'Yes');
 const schema={options:['nr_mpi','nr_threads','do_grad','do_em'].map(key=>({key,default:'1'}))};
 assert.equal(workstationDefaults(l,schema,v,{globalNcpus:'12',globalNgpus:'3'}).nr_mpi,'4');
});
