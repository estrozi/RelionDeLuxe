import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {recordPickingHistory} from '../lib/picking-history.mjs';
test('cleaning history appends across continuations and keeps coordinates out of stdout',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'history-'));
 try{
  const job='AutoPick/job009/';await fs.mkdir(path.join(root,job),{recursive:true});
  await recordPickingHistory(root,job,'continue-manual',{settings:{diameter:'180'}});
  await recordPickingHistory(root,job,'manual-coordinate-save',{before:[{x:1,y:2}],after:[],beforeCount:1,afterCount:0});
  await fs.writeFile(path.join(root,job,'run.out'),'');
  await recordPickingHistory(root,job,'power-filter',{diameter:180,thresholds:{mode:'both',multiplier:2,upperMultiplier:3},backup:'particle-backups/test.json'});
  const records=(await fs.readFile(path.join(root,job,'manual-cleaning-history.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(records.length,3);assert.deepEqual(records[1].before,[{x:1,y:2}]);assert.equal(records[2].thresholds.upperMultiplier,3);
  assert.ok(records.every(r=>Number.isFinite(Date.parse(r.time))));
  const log=await fs.readFile(path.join(root,job,'run.out'),'utf8');assert.match(log,/power-filter/);assert.doesNotMatch(log,/"before":/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
