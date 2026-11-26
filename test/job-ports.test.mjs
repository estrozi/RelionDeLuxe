import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {families,connectionsFor,potentialConnection} from '../public/job-ports.js';
test('every official and custom job type has valid connector families',async()=>{
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
 for(const id of [...layout.map(l=>l.id),1001,1002]){
  const roles=connectionsFor(id);assert.ok(roles.flat().length,`Missing ${id}`);
  for(const key of roles.flat())assert.ok(families[key],key);
 }
});
test('family matching is directed and preserves atomic model distinction',()=>{
 assert.equal(potentialConnection(1,2),true);
 assert.equal(potentialConnection(12,15),true);
 assert.equal(potentialConnection(5,8),true);
 assert.equal(potentialConnection(23,5),false);
 assert.equal(connectionsFor(4)[1].includes('models'),false);
 assert.equal(potentialConnection(5,5),false);
});
test('direct postprocess and continuation inputs are represented accurately',()=>{
 assert.ok(connectionsFor(18)[0].includes('checkpoints'));
 assert.ok(!connectionsFor(7)[0].includes('maps'));
 assert.ok(!connectionsFor(21)[0].includes('masks'));
 for(const id of [20,21])assert.ok(connectionsFor(id)[0].includes('postprocess'));
 assert.ok(connectionsFor(15)[1].includes('postprocess'));
 assert.equal(potentialConnection(15,21),true);
});
