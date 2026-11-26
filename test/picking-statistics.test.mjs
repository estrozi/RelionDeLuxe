import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {powerSummary,diskStats,thresholds,rejected,particleStatistics,filterParticles,undoParticleFilter,particleBackups} from '../lib/picking-statistics.mjs';
import {coordinateText,pickerCoordinates} from '../lib/browser-picker.mjs';
import {parseStar} from '../lib/gallery.mjs';
test('disk statistics calculate mean square and population stddev, reject edges/nonfinite',()=>{
 const b=Buffer.alloc(8+25*4);for(let i=0;i<25;i++)b.writeFloatLE(2,8+i*4);
 assert.deepEqual(diskStats(b,5,5,{x:2,y:2},1),{valid:true,power:4,stddev:0,pixels:5});
 b.writeFloatLE(7,8+12*4);const r=diskStats(b,5,5,{x:2,y:2},1);
 assert.equal(r.power,13);assert.equal(r.stddev,2);
 assert.equal(diskStats(b,5,5,{x:0,y:0},1).valid,false);
 b.writeFloatLE(NaN,8+12*4);assert.equal(diskStats(b,5,5,{x:2,y:2},1).valid,false);
 assert.throws(()=>thresholds({powerMin:10,powerMax:2}),/Minimum/);
 assert.equal(rejected({valid:true,power:4,stddev:2},thresholds({stdMax:1})),true);
});
test('statistics cache invalidation, filtering with backup, undo and conflict protection',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'particle-quality-')),job='ManualPick/job001/';
 try{
  await fs.mkdir(path.join(root,job),{recursive:true});
  const map=Buffer.alloc(1024+100*4);map.writeInt32LE(10,0);map.writeInt32LE(10,4);map.writeInt32LE(1,8);map.writeInt32LE(2,12);
  for(let y=0;y<10;y++)for(let x=0;x<10;x++)map.writeFloatLE(x<5?2:5,1024+4*(y*10+x));
  await fs.writeFile(path.join(root,'a.mrc'),map);
  const coord=path.join(root,job,'a_manualpick.star');
  await fs.writeFile(coord,coordinateText([{x:2,y:2},{x:7,y:7}]));
  const context={values:{},mics:[{index:0,file:'a.mrc',pixel:1}]};
  const {workerParticleStatistics}=await import('../lib/power-workers.mjs');
  const parallel=await Promise.all([workerParticleStatistics(root,[],job,context,0,2),workerParticleStatistics(root,[],job,context,0,2)]);assert.deepEqual(parallel[0].rows,parallel[1].rows);
  const first=await particleStatistics(root,[],job,context,0,2);assert.deepEqual(first.rows.map(r=>r.power),[4,25]);
  assert.equal((await particleStatistics(root,[],job,context,0,2)).cached,true);
  assert.notEqual((await particleStatistics(root,[],job,context,0,3)).key,first.key);
  const adapter={call:async args=>{assert.equal(args[0],'browser-pick-save');await fs.copyFile(args[3],coord);}};
  const result=await filterParticles(root,[],adapter,job,context,{index:0,diameter:2,key:first.key,thresholds:{powerMax:10}});
  assert.equal(result.removed,1);assert.deepEqual((await particleBackups(root,job)).backups,[result.backup]);assert.equal((await pickerCoordinates(root,[],job,context.mics[0])).points.length,1);
  assert.equal((await fs.readdir(path.join(root,job,'particle-backups'))).length,1);
  await undoParticleFilter(root,[],adapter,job,context,result.backup);
  assert.deepEqual((await particleBackups(root,job)).backups,[]);
  assert.equal((await pickerCoordinates(root,[],job,context.mics[0])).points.length,2);
  const bothStats=await particleStatistics(root,[],job,context,0,2);
  const both=await filterParticles(root,[],adapter,job,context,{index:0,diameter:2,key:bothStats.key,automaticPower:true,powerMode:'both',powerMultiplier:0.5,upperPowerMultiplier:0.5});
  assert.equal(both.removed,2,'both tails must use the original statistics');
  assert.equal((await pickerCoordinates(root,[],job,context.mics[0])).points.length,0);
  const backup=JSON.parse(await fs.readFile(path.join(root,job,'particle-backups',both.backup+'.json'),'utf8'));
  assert.equal(backup.thresholds.mode,'both');
  await undoParticleFilter(root,[],adapter,job,context,both.backup);
  await fs.writeFile(coord,coordinateText([{x:3,y:4}]));
  await assert.rejects(undoParticleFilter(root,[],adapter,job,context,result.backup),/later edits/);
  await assert.rejects(filterParticles(root,[],adapter,job,context,{index:0,diameter:2,key:first.key,thresholds:{}}),/stale/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('native picker filtering publishes mappings and undo restores coordinates',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{
 const {NativeAdapter}=await import('../lib/native.mjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'native-quality-'));
 try{
  const adapter=new NativeAdapter(root,path.resolve(process.env.RELION_DELUXE_BRIDGE));await adapter.call(['init']);
  const map=Buffer.alloc(1024+100*4);for(const [offset,value] of [[0,10],[4,10],[8,1],[12,2]])map.writeInt32LE(value,offset);
  for(let y=0;y<10;y++)for(let x=0;x<10;x++)map.writeFloatLE(x<5?2:5,1024+4*(y*10+x));
  await fs.writeFile(path.join(root,'a.mrc'),map);
  await fs.writeFile(path.join(root,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 1\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\na.mrc 1\n');
  const schema=(await adapter.call(['schema'])).find(s=>s.id===3);
  const started=await adapter.submit('browser-pick',{id:3,label:'relion.manualpick',name:'Manual picking'},schema,{fn_in:'mics.star',diameter:'2',lowpass:'-1'},'',''),job=started.name;
  const temp=path.join(root,'picks.star');await fs.writeFile(temp,coordinateText([{x:2,y:2},{x:7,y:7}]));
  await adapter.call(['browser-pick-save',job,'0',temp]);
  const context={values:{},mics:[{index:0,file:'a.mrc',pixel:1}]},stats=await particleStatistics(root,[],job,context,0,2);
  const result=await filterParticles(root,[],adapter,job,context,{index:0,diameter:2,key:stats.key,thresholds:{powerMax:10}});
  assert.equal((await pickerCoordinates(root,[],job,context.mics[0])).points.length,1);
  assert.match(await fs.readFile(path.join(root,job,'manualpick.star'),'utf8'),/a_manualpick.star/);
  await undoParticleFilter(root,[],adapter,job,context,result.backup);
  assert.equal((await pickerCoordinates(root,[],job,context.mics[0])).points.length,2);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

test('automatic power screening is per micrograph and uses strict cutoff',()=>{
 const rows=[{valid:true,power:0},...Array.from({length:20},()=>({valid:true,power:100}))];
 const s=powerSummary(rows);assert.equal(s.cutoff,s.average-2*s.stddev);assert.equal(powerSummary(rows,1.7).cutoff,s.average-1.7*s.stddev);assert.throws(()=>powerSummary(rows,-1),/non-negative/);assert.ok(s.cutoff>0);assert.equal(rows.filter(r=>r.power>s.cutoff).length,20);
 assert.equal(powerSummary([{valid:true,power:100},{valid:true,power:100}]).cutoff,100);
 assert.equal(powerSummary([...rows,{valid:false,power:1e9}]).average,s.average);
 const b=Buffer.alloc(8+25*4);for(let i=0;i<25;i++)b.writeFloatLE(2,8+i*4);
 assert.deepEqual(diskStats(b,5,5,{x:2,y:2},1,true),{valid:true,power:4,pixels:5});
});
