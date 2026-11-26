import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {prepareScreening,saveScreening,copyScreenedFiles,selectedScreeningRows,validateScreening,ScreeningAdapter,screeningLayout,screeningSchema,SCREENING} from '../lib/screening.mjs';
import {NativeAdapter} from '../lib/native.mjs';
import {syncConvergenceScroll} from '../public/convergence.js';
test('2D plots scroll together in either direction',()=>{
 const plots=[0,1].map(()=>({scrollLeft:0,addEventListener(name,fn){this.scroll=fn;}}));
 syncConvergenceScroll({querySelectorAll:()=>plots});plots[0].scrollLeft=120;plots[0].scroll();assert.equal(plots[1].scrollLeft,120);plots[1].scrollLeft=40;plots[1].scroll();assert.equal(plots[0].scrollLeft,40);
});
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'screening-')),project=path.join(root,'project'),source=path.join(root,"remote collection's");
 await fs.mkdir(project);
 const bin=path.join(root,'bin');await fs.mkdir(bin);await fs.writeFile(path.join(bin,'relion_image_handler'),"#!/bin/sh\nprintf 'frame1\\nframe2\\n'\n",{mode:0o700});process.env.PATH=bin+path.delimiter+process.env.PATH;
 await fs.mkdir(path.join(source,'GridSquare/Data'),{recursive:true});
 for(const [name,text] of [['FoilHole_001_Data_123.jpg','jpeg'],['FoilHole_001_Data_123_Fractions.tiff','BIG1'],['FoilHole_002_Data_123.jpg','jpeg2'],['FoilHole_002_Data_123_Fractions.mrc','BIG2'],['FoilHole_003_Data_123.jpg','missing'],['other.jpg','ignored'],['FoilHole_999.jpg','overview']])await fs.writeFile(path.join(source,'GridSquare/Data',name),text);
 return {root,project,source,values:{collection_path:source,data_suffix:'_Fractions',data_extension:'auto',destination_folder:'Movies',jpg_folder:'JPGs'}};
}
test('screening copies only previews, copies selected data, handles quoted paths and rejects invalid matches',async()=>{
 const f=await fixture();try{
  const job='External/job001/';await fs.mkdir(path.join(f.project,job),{recursive:true});
  await assert.rejects(prepareScreening(f.project,[],job,f.values),/outside configured/);
  const m=await prepareScreening(f.project,[f.source],job,f.values);assert.equal(m.rows.length,3);await assert.rejects(fs.stat(path.join(f.project,'JPGs/External/job001/GridSquare/Data/FoilHole_999.jpg')),/ENOENT/);
  assert.equal(await fs.readFile(path.join(f.project,m.rows[0].jpeg),'utf8'),'jpeg');
  await assert.rejects(fs.stat(path.join(f.project,'Movies')),/ENOENT/);
  assert.match(m.rows[2].error,/No matching/);
  assert.throws(()=>selectedScreeningRows(m,[2]),/No matching/);
  assert.throws(()=>selectedScreeningRows({...m,rows:[m.rows[0],m.rows[0]]},[0,1]),/Duplicate/);
  await assert.rejects(saveScreening(f.project,[f.source],job,'stale',[0]),/changed/);
  const result=await saveScreening(f.project,[f.source],job,m.revision,[0]);assert.equal(result.count,1);
  const copied=await copyScreenedFiles(f.project,[f.source],job);assert.equal(copied.folder,'Movies');
  assert.equal(await fs.readFile(path.join(f.project,'Movies/FoilHole_001_Data_123_Fractions.tiff'),'utf8'),'BIG1');
  await assert.rejects(fs.stat(path.join(f.project,'Movies/FoilHole_002_Data_123_Fractions.mrc')),/ENOENT/);
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/already exists/);
  await fs.symlink(f.source,path.join(f.project,'bad'));
  await assert.rejects(prepareScreening(f.project,[f.source],'External/job002/',{...f.values,jpg_folder:'bad'}),/Symbolic/);
  assert.throws(()=>validateScreening({...f.values,destination_folder:'../bad'}),/project-relative/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('ambiguous full-size extensions require explicit selection',async()=>{
 const f=await fixture();try{
  await fs.writeFile(path.join(f.source,'GridSquare/Data/FoilHole_001_Data_123_Fractions.mrc'),'MRC');
  await fs.mkdir(path.join(f.project,'External/job001'),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],'External/job001/',f.values);assert.match(m.rows[0].error,/Multiple/);
  await fs.mkdir(path.join(f.project,'External/job002'),{recursive:true});
  const n=await prepareScreening(f.project,[f.source],'External/job002/',{...f.values,data_extension:'.tiff'});assert.equal(n.rows[0].error,'');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
const bridge=process.env.TEST_RELION_BRIDGE;
test('native External screening retains pipeline accounting and finishes after selection',{skip:!bridge},async()=>{
 const f=await fixture();let job;
 const wait=async check=>{for(let i=0;i<100;i++){const result=await check();if(result)return result;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for screening runner');};
 try{
  await fs.copyFile(new URL('./fixtures/gain-tiff/big-endian.tif',import.meta.url),path.join(f.source,'camera_gain.tif'));
  const adapter=new ScreeningAdapter(new NativeAdapter(f.project,bridge),f.project,[f.source]);
  await adapter.call(['init']);
  await assert.rejects(adapter.submit('schedule',screeningLayout,screeningSchema,f.values),/interactive/);
  const result=await adapter.submit('run',screeningLayout,screeningSchema,f.values);job=result.name;
  assert.equal(result.browserScreening,true);
  const manifest=await wait(()=>fs.readFile(path.join(f.project,job,'screening.json'),'utf8').then(JSON.parse,()=>null));
  const state=await adapter.call(['state']);assert.equal(state.jobs.find(j=>j.name===job).type,SCREENING);
  assert.deepEqual((await adapter.call(['job',job])).values,f.values);
  await saveScreening(f.project,[f.source],job,manifest.revision,[0]);
  await wait(()=>fs.stat(path.join(f.project,job,'RELION_JOB_EXIT_SUCCESS')).catch(()=>null));
  const refreshed=await adapter.call(['refresh']);const finished=refreshed.jobs.find(j=>j.name===job);
  assert.equal(finished.status,'Succeeded');assert.ok(finished.outputs.includes('Movies'));assert.ok(finished.outputs.includes('camera_gain.mrc'));
  assert.equal((await fs.readFile(path.join(f.project,'camera_gain.mrc'))).readFloatLE(1024),7);
  const before=await fs.stat(path.join(f.project,'Movies/FoilHole_001_Data_123_Fractions.tiff'));
  await fs.writeFile(path.join(f.source,'GridSquare/Data/FoilHole_004_Data_123.jpg'),'new preview');
  await fs.writeFile(path.join(f.source,'GridSquare/Data/FoilHole_004_Data_123_Fractions.tiff'),'NEW');
  await fs.copyFile(new URL('./fixtures/gain-tiff/big-endian.tif',import.meta.url),path.join(f.source,'new_gain.tif'));
  const continued=await adapter.submit('continue',screeningLayout,screeningSchema,f.values,job);
  assert.equal(continued.name,job);
  const next=await wait(async()=>{const m=await fs.readFile(path.join(f.project,job,'screening.json'),'utf8').then(JSON.parse,()=>null);return m?.revision!==manifest.revision&&m?.continuation?m:null;});
  assert.equal(next.rows.length,4);assert.deepEqual(next.initialSelection,[0]);
  await assert.rejects(saveScreening(f.project,[f.source],job,manifest.revision,[0]),/changed/);
  await saveScreening(f.project,[f.source],job,next.revision,[0,3]);
  await wait(()=>fs.stat(path.join(f.project,job,'RELION_JOB_EXIT_SUCCESS')).catch(()=>null));
  const report=JSON.parse(await fs.readFile(path.join(f.project,job,'screening-copy.json')));
  assert.equal(report.copied,1);assert.equal(report.reused,1);assert.equal(report.gains.length,2);
  assert.equal((await fs.stat(path.join(f.project,'Movies/FoilHole_001_Data_123_Fractions.tiff'))).mtimeMs,before.mtimeMs);
  assert.equal(await fs.readFile(path.join(f.project,'Movies/FoilHole_004_Data_123_Fractions.tiff'),'utf8'),'NEW');
  assert.equal((await adapter.call(['refresh'])).jobs.find(j=>j.name===job).status,'Succeeded');

 }finally{
  if(job)await fs.writeFile(path.join(f.project,job,'RELION_JOB_ABORT_NOW'),'').catch(()=>{});
  await fs.rm(f.root,{recursive:true,force:true});
 }
});
test('screening HTTP workflow is authenticated and returns gallery, JPEG and script',{skip:!bridge},async()=>{
 const {spawn}=await import('node:child_process'),{once}=await import('node:events');
 const f=await fixture();let child;
 try{
  await new NativeAdapter(f.project,bridge).call(['init']);
  child=spawn(process.execPath,['server.mjs','--project',f.project,'--bridge',bridge,'--read-root',f.source,'--port','23460'],{cwd:new URL('..',import.meta.url),stdio:['ignore','pipe','pipe']});
  const token=await new Promise((resolve,reject)=>{child.stdout.on('data',x=>{const m=x.toString().match(/#token=([a-f0-9]+)/);if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',()=>reject(Error('Server stopped')));});
  const base='http://127.0.0.1:23460',headers={'X-Relion-Token':token};
  const post=async(route,body)=>{const r=await fetch(base+'/api/'+route,{method:'POST',headers:{...headers,'Content-Type':'application/json','X-Request-ID':crypto.randomUUID()},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;};
  const config=await (await fetch(base+'/api/config',{headers})).json();assert.equal(config.layout[0].number,'00');
  const module=await fetch(base+'/screening-gallery.js');assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  const preview=await post('preview',{type:SCREENING,values:f.values});assert.match(preview.command,/screening-runner/);
  const run=await post('run',{type:SCREENING,values:f.values});assert.equal(run.browserScreening,true);
  const query='?job='+encodeURIComponent(run.name);let manifest;
  assert.equal((await fetch(base+'/api/screening'+query)).status,401);
  for(let i=0;i<60;i++){manifest=await (await fetch(base+'/api/screening'+query,{headers})).json();if(!manifest.pending)break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(manifest.rows.length,3);assert.equal(manifest.writable,true);
  const image=await fetch(base+'/api/screening-image'+query+'&index=0',{headers});assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/jpeg');assert.equal(await image.text(),'jpeg');
  const saved=await post('screening-save',{job:run.name,revision:manifest.revision,indices:[0]});assert.equal(saved.count,1);
  assert.equal(saved.copying,true);
  const duplicate=await fetch(base+'/api/screening-save',{method:'POST',headers:{...headers,'Content-Type':'application/json','X-Request-ID':crypto.randomUUID()},body:JSON.stringify({job:run.name,revision:manifest.revision,indices:[0]})});assert.equal(duplicate.status,400);
  for(let i=0;i<30;i++){if(await fs.stat(path.join(f.project,run.name,'RELION_JOB_EXIT_SUCCESS')).catch(()=>null))break;await new Promise(r=>setTimeout(r,100));}
 }finally{if(child&&child.exitCode===null){child.kill();await once(child,'exit');}await fs.rm(f.root,{recursive:true,force:true});}
});

import {toggleScreeningSelection} from '../public/screening-selection.js';
test('screening Shift-click spans page boundaries and follows sorting order',()=>{
 const order=Array.from({length:100},(_,i)=>i);
 let state=toggleScreeningSelection(new Set(),order,60,null,false);
 state=toggleScreeningSelection(state.chosen,order,65,state.anchor,true);
 assert.deepEqual([...state.chosen],[60,61,62,63,64,65]);
 state=toggleScreeningSelection(state.chosen,order,60,state.anchor,false);
 state=toggleScreeningSelection(state.chosen,order,65,state.anchor,true);assert.equal(state.chosen.size,0);
 const reversed=toggleScreeningSelection(new Set([65]),[...order].reverse(),60,65,true);assert.equal(reversed.chosen.size,6);
});

import {screeningCandidates} from '../public/screening-selection.js';
test('missing full-size previews are excluded without renumbering images or retaining old selections',()=>{
 const rows=[{index:0,error:''},{index:1,error:'No matching full-size file'},{index:2,error:''},{index:3,error:'Multiple full-size files match; specify the data extension'}];
 const result=screeningCandidates(rows,[0,1,2,77]);
 assert.deepEqual(result.rows.map(r=>r.index),[0,2,3]);
 assert.deepEqual([...result.chosen],[0,2]);assert.equal(result.excluded,1);
 assert.equal(screeningCandidates([rows[1]],[1]).rows.length,0);
 assert.equal(screeningCandidates([rows[1]],[1]).chosen.size,0);
});

test('single-frame files go to Micrographs and aborted copying never publishes partial files',async()=>{
 const f=await fixture();try{
  await fs.writeFile(path.join(f.root,'bin/relion_image_handler'),['#!/bin/sh',"echo 'one frame'",''].join('\n'),{mode:0o700});
  const job='External/job001/';await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);await saveScreening(f.project,[f.source],job,m.revision,[0]);
  const result=await copyScreenedFiles(f.project,[f.source],job);assert.equal(result.folder,'Micrographs');assert.equal(result.frames,1);
  await fs.rm(path.join(f.project,'Micrographs'),{recursive:true});
  let copying=false;
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job,async message=>{if(message.startsWith('Copying'))copying=true;},async()=>{if(copying)throw Error('Aborted');}),/Aborted/);
  assert.deepEqual(await fs.readdir(path.join(f.project,'Micrographs')),[]);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('unchanged continuation reuses previews and frame detection; changed previews refresh',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0]);
  await copyScreenedFiles(f.project,[f.source],job);
  const preview=path.join(f.project,m.rows[0].jpeg),before=await fs.stat(preview);
  // A second invocation would fail: unchanged data must use cached frame metadata.
  await fs.writeFile(path.join(f.root,'bin/relion_image_handler'),'#!/bin/sh\nexit 99\n',{mode:0o700});
  const context={continuation:true,previousRows:m.rows,previousFolder:'Movies',selectedSources:[m.rows[0].source]};
  const n=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,context);
  assert.deepEqual(n.previewCounts,{copied:0,reused:3});
  assert.equal((await fs.stat(preview)).mtimeMs,before.mtimeMs);
  assert.deepEqual(n.initialSelection,[0]);
  await saveScreening(f.project,[f.source],job,n.revision,[0]);
  const report=await copyScreenedFiles(f.project,[f.source],job);
  assert.equal(report.copied,0);assert.equal(report.reused,1);
  await fs.writeFile(path.join(f.source,m.rows[0].relative),'updated JPEG');
  const updated=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,{...context,previousRows:n.rows});
  assert.deepEqual(updated.previewCounts,{copied:1,reused:2});
  assert.equal(await fs.readFile(preview,'utf8'),'updated JPEG');
  await fs.writeFile(m.rows[0].source,'changed full-size file');
  await saveScreening(f.project,[f.source],job,updated.revision,[0]);
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/Command failed/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('copy reuse compares source snapshots, ignores destination dates/inodes and rejects size changes',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0]);
  await copyScreenedFiles(f.project,[f.source],job);
  const ledgerFile=path.join(f.project,job,'screening-files.json'),ledger=JSON.parse(await fs.readFile(ledgerFile));
  const dest=Object.keys(ledger)[0];ledger[dest].inode=-123;
  await fs.writeFile(ledgerFile,JSON.stringify(ledger));
  const destinationDate=new Date('2001-01-01T00:00:00Z');
  await fs.utimes(dest,destinationDate,destinationDate);
  const n=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,{continuation:true,previousRows:m.rows,previousFolder:'Movies'});
  await saveScreening(f.project,[f.source],job,n.revision,[0]);
  assert.equal((await copyScreenedFiles(f.project,[f.source],job)).reused,1);
  assert.equal((await fs.stat(dest)).mtimeMs,destinationDate.getTime());
  // A changed source must not pass just because destination size is unchanged.
  const sourceStat=await fs.stat(m.rows[0].source);
  await fs.utimes(m.rows[0].source,sourceStat.atime,new Date(sourceStat.mtimeMs+5000));
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/Source snapshot has changed/);
  await fs.utimes(m.rows[0].source,sourceStat.atime,sourceStat.mtime);
  await fs.writeFile(dest,'different size');
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/No content hashing/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('real TIFF screening counts frames without invoking image-handler statistics',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  await fs.copyFile(new URL('./fixtures/gain-tiff/big-endian.tif',import.meta.url),path.join(f.source,'GridSquare/Data/FoilHole_001_Data_123_Fractions.tiff'));
  await fs.writeFile(path.join(f.root,'bin/relion_image_handler'),'#!/bin/sh\nexit 99\n',{mode:0o700});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0]);
  const result=await copyScreenedFiles(f.project,[f.source],job);
  assert.equal(result.frames,1);assert.equal(result.folder,'Micrographs');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('continuation adopts same-size manual copies with different dates and records source snapshots',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0]);
  await copyScreenedFiles(f.project,[f.source],job);
  const source=m.rows[1].source,dest=path.join(f.project,'Movies',path.basename(source));
  await fs.copyFile(source,dest);
  const date=new Date('2001-01-01T00:00:00Z');await fs.utimes(dest,date,date);
  const n=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,{continuation:true,previousRows:m.rows,previousFolder:'Movies'});
  await saveScreening(f.project,[f.source],job,n.revision,[0,1]);
  const report=await copyScreenedFiles(f.project,[f.source],job);
  assert.equal(report.copied,0);assert.equal(report.reused,2);
  assert.equal((await fs.stat(dest)).mtimeMs,date.getTime());
  const ledger=JSON.parse(await fs.readFile(path.join(f.project,job,'screening-files.json')));
  assert.equal(ledger[dest].source,source);
  assert.equal(ledger[dest].sourceMtime,(await fs.stat(source)).mtimeMs);
  assert.equal((await copyScreenedFiles(f.project,[f.source],job)).reused,2);
  await fs.utimes(source,date,date);
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/Source snapshot has changed/);
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('continuation deletes deselected tracked files, preserves unrelated files and supports clearing selection',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0,1]);await copyScreenedFiles(f.project,[f.source],job);
  const unrelated=path.join(f.project,'Movies/unrelated.tiff');await fs.writeFile(unrelated,'leave me');
  const n=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,{continuation:true,previousRows:m.rows,previousFolder:'Movies'});
  await saveScreening(f.project,[f.source],job,n.revision,[0]);
  assert.equal((await copyScreenedFiles(f.project,[f.source],job)).deleted,1);
  await assert.rejects(fs.stat(path.join(f.project,'Movies',path.basename(m.rows[1].source))),/ENOENT/);
  assert.equal(await fs.readFile(m.rows[1].source,'utf8'),'BIG2');
  assert.equal(await fs.readFile(unrelated,'utf8'),'leave me');
  await saveScreening(f.project,[f.source],job,n.revision,[]);
  assert.equal((await copyScreenedFiles(f.project,[f.source],job)).deleted,1);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(f.project,job,'screening-files.json'))),{});
  assert.equal(await fs.readFile(unrelated,'utf8'),'leave me');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
test('deselection removes an untracked manual copy matching the collection, not unrelated files',async()=>{
 const f=await fixture(),job='External/job001/';
 try{
  await fs.mkdir(path.join(f.project,job),{recursive:true});
  const m=await prepareScreening(f.project,[f.source],job,f.values);
  await saveScreening(f.project,[f.source],job,m.revision,[0]);await copyScreenedFiles(f.project,[f.source],job);
  const manual=path.join(f.project,'Movies',path.basename(m.rows[1].source));
  await fs.copyFile(m.rows[1].source,manual);await fs.utimes(manual,1,1);
  await fs.writeFile(path.join(f.project,'Movies/unrelated.tiff'),'keep');
  const n=await prepareScreening(f.project,[f.source],job,f.values,undefined,undefined,{continuation:true,previousRows:m.rows,previousFolder:'Movies'});
  await saveScreening(f.project,[f.source],job,n.revision,[0]);
  const r=await copyScreenedFiles(f.project,[f.source],job);assert.equal(r.deleted,1);assert.equal(r.reused,1);
  await assert.rejects(fs.stat(manual),/ENOENT/);
  assert.equal(await fs.readFile(m.rows[1].source,'utf8'),'BIG2');
  assert.equal(await fs.readFile(path.join(f.project,'Movies/unrelated.tiff'),'utf8'),'keep');
  await fs.writeFile(manual,'wrong size');
  await assert.rejects(copyScreenedFiles(f.project,[f.source],job),/differs in size/);
  assert.equal(await fs.readFile(manual,'utf8'),'wrong size');
 }finally{await fs.rm(f.root,{recursive:true,force:true});}
});
