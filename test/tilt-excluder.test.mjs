import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {tiltManifest,exclusionView,saveExclusion} from '../lib/tilt-excluder.mjs';
import {parseStar} from '../lib/gallery.mjs';
test('tilt exclusion preserves metadata, filters rows, removes empty series and rejects stale saves',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'excluder-'));
 try{
  await fs.mkdir(path.join(root,'ExcludeTiltImages/job002'),{recursive:true});
  const source='data_global\nloop_\n_rlnTomoName\n_rlnTomoTiltSeriesStarFile\n_rlnTomoTiltSeriesPixelSize\nTS_1 one.star 1.2\nTS_2 two.star 1.4\n';
  const tilt='data_TS_1\nloop_\n_rlnMicrographName\n_rlnTomoNominalStageTiltAngle\n_rlnDefocusU\n_rlnTomoXTilt\nplus.mrc 30 12345 0.5\nminus.mrc -30 23456 0.6\n';
  await fs.writeFile(path.join(root,'input.star'),source);await fs.writeFile(path.join(root,'one.star'),tilt);await fs.writeFile(path.join(root,'two.star'),tilt.replace('TS_1','TS_2'));
  const m=await tiltManifest(root,[],'input.star'),jobFile=async n=>path.join(root,'ExcludeTiltImages/job002',n);
  assert.deepEqual(m.series[0].images.map(i=>i.id),[1,0]);
  const view=await exclusionView(m,jobFile,true);assert.equal(view.writable,true);
  const body={revision:view.revision,version:view.version,selected:[[1],[]]};
  await assert.rejects(saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',{...body,selected:[[5],[]]}),/Invalid tilt/);
  await assert.rejects(saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',{...body,selected:[[],[]]},true),/Keep at least/);
  const saved=await saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',body);
  await assert.rejects(fs.access(await jobFile('selected_tilt_series.star')));
  await assert.rejects(saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',body),/changed/);
  const done=await saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',{...body,version:saved.version},true);
  assert.equal(done.count,1);assert.equal(done.series,1);
  const global=parseStar(await fs.readFile(await jobFile('selected_tilt_series.star'),'utf8')).find(b=>b.name==='global').tables[0];
  assert.equal(global.rows[0].rlnTomoTiltSeriesStarFile,'ExcludeTiltImages/job002/tilt_series/TS_1.star');assert.equal(global.labels.at(-1),'rlnTomoTiltSeriesStarFile');assert.equal(global.rows.length,1);assert.equal(global.rows[0].rlnTomoTiltSeriesPixelSize,'1.2');
  const text=await fs.readFile(path.join(root,global.rows[0].rlnTomoTiltSeriesStarFile),'utf8');assert.ok(text.startsWith('data_TS_1\n'));assert.match(text,/_rlnMicrographName #1/);assert.match(text,/minus\.mrc\t-30\t23456\t0\.6/);
  const rows=parseStar(text).find(b=>b.name==='TS_1').tables[0].rows;assert.deepEqual(rows,[{rlnMicrographName:'minus.mrc',rlnTomoNominalStageTiltAngle:'-30',rlnDefocusU:'23456',rlnTomoXTilt:'0.6'}]);
  assert.equal(await fs.readFile(path.join(root,'one.star'),'utf8'),tilt);
  const again=await saveExclusion(m,jobFile,'ExcludeTiltImages/job002/',{...body,version:done.version,selected:[[0],[]]},true);
  assert.equal(again.count,1);
  assert.match(await fs.readFile(path.join(root,'ExcludeTiltImages/job002/tilt_series/TS_1.star'),'utf8'),/plus\.mrc/);
  await assert.rejects(saveExclusion({...m,series:m.series.map((s,i)=>({...s,name:i?'TS_2':'../escape'}))},jobFile,'ExcludeTiltImages/job002/',{...body,version:again.version},true),/Invalid tilt-series name/);

  await fs.appendFile(path.join(root,'one.star'),'\n# changed');
  await assert.rejects(exclusionView(await tiltManifest(root,[],'input.star'),jobFile),/input changed/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('browser exclusion has explicit native capability, finish route and static assets',async()=>{
 const native=await fs.readFile(new URL('../native/deluxe_bridge.cpp',import.meta.url),'utf8');assert.match(native,/browserTiltExclusion/);assert.match(native,/excluding\)ensure\(tomoMode\(\)&&j.type==57/);
 const server=await fs.readFile(new URL('../server.mjs',import.meta.url),'utf8');assert.match(server,/excluder-finish/);assert.match(server,/useExclude\?'browser-exclude'/);
 for(const file of ['excluder.html','excluder.js','excluder.css'])assert.ok(server.includes("'/"+file+"':'"+file+"'"));
});
