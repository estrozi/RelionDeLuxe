import test from 'node:test';import assert from 'node:assert/strict';
import {ProjectDefaults} from '../lib/project-defaults.mjs';
import {detectLocalResources} from '../lib/local-resources.mjs';
test('local defaults fill missing resources, preserve saved budgets and disable queues',async()=>{
 const d=new ProjectDefaults('.',true,{resources:{globalNcpus:'16',globalNgpus:'2'},localOnly:true});
 let v=await d.read();assert.equal(v.globalNcpus,'16');assert.equal(v.do_queue,'No');
 d.memory={globalNcpus:'8',do_queue:'Yes'};v=await d.read();assert.equal(v.globalNcpus,'8');assert.equal(v.globalNgpus,'2');assert.equal(v.do_queue,'No');
 const cluster=new ProjectDefaults('.',true);cluster.memory={do_queue:'Yes'};assert.equal((await cluster.read()).do_queue,'Yes');
});
test('CPU detection provides a positive physical count or remains unset',async()=>{const v=await detectLocalResources();if(v.globalNcpus!==undefined){assert(Number.isInteger(Number(v.globalNcpus)));assert(Number(v.globalNcpus)>0);}});
test('physical core count deduplicates SMT siblings within allowed CPUs',async()=>{
 const {countPhysicalCores}=await import('../lib/local-resources.mjs');
 const info=[0,1,2,3].map(i=>'processor: '+i+'\nphysical id: 0\ncore id: '+Math.floor(i/2)).join('\n\n');
 assert.equal(countPhysicalCores(info,'0-3'),2);
 assert.equal(countPhysicalCores(info,'0,1'),1);
 assert.equal(countPhysicalCores('processor: 0','0'),null);
});
