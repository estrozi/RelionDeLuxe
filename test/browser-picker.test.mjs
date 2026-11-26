import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {NativeAdapter} from '../lib/native.mjs';import {resumeManualPicker,pickerSnapshot,pickerCoordinates,pickerImage,coordinateName,coordinateText,supportsPicker} from '../lib/browser-picker.mjs';import {parseStar} from '../lib/gallery.mjs';
test('Picker refuses unsupported modes and invalid coordinates',()=>{assert(supportsPicker({fn_in:'mics.star'}));assert(supportsPicker({fn_in:'mics.star',do_startend:'Yes'}));assert(!supportsPicker({fn_in:'*.mrc'}));assert(supportsPicker({fn_in:'mics.star',do_topaz_denoise:'Yes'}));for(const k of ['do_fom_threshold','do_color'])assert(!supportsPicker({fn_in:'mics.star',[k]:'Yes'}));assert.throws(()=>coordinateText([{x:NaN,y:1}]),/Invalid/);});
test('Native manual picking saves progress, mapping and optics before finishing',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'browser-pick-'));try{
 const adapter=new NativeAdapter(project,path.resolve(process.env.RELION_DELUXE_BRIDGE));await adapter.call(['init']);await fs.mkdir(path.join(project,'MotionCorr/job004/Movies'),{recursive:true});
 await fs.writeFile(path.join(project,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 1.25\n\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\nMotionCorr/job004/Movies/mic.mrc 1\n');
 const map=Buffer.alloc(1024+8*4);map.writeInt32LE(4,0);map.writeInt32LE(2,4);map.writeInt32LE(1,8);map.writeInt32LE(2,12);for(let i=0;i<8;i++)map.writeFloatLE(i,1024+i*4);await fs.writeFile(path.join(project,'MotionCorr/job004/Movies/mic.mrc'),map);
 const values={fn_in:'mics.star',lowpass:'-1',highpass:'-1',diameter:'100',angpix:'-1'},snapshot=await pickerSnapshot(project,[],values);assert.equal(snapshot.mics[0].pixel,1.25);const image=await pickerImage(project,[],snapshot.mics[0],values);assert.equal(image.nx,4);assert.equal(image.ny,2);
 const schema=(await adapter.call(['schema'])).find(s=>s.id===3);const started=await adapter.submit('browser-pick',{id:3,label:'relion.manualpick',name:'Manual picking'},schema,values,'','');
 assert.equal((await adapter.call(['state'])).jobs[0].status,'Running');
 // Recover a running job whose browser marker was never written (or was lost).
 const jobFile=file=>path.join(project,started.name,file);
 const originalSettings=await fs.readFile(jobFile('job.star'),'utf8');
 await fs.unlink(jobFile('RELIONDELUXE_BROWSER_PICKING'));
 await resumeManualPicker(project,[],values,jobFile);
 assert.equal(await fs.readFile(jobFile('browser-picking-input.txt'),'utf8'),snapshot.revision);
 assert.equal(await fs.readFile(jobFile('job.star'),'utf8'),originalSettings);
 assert.equal((await adapter.call(['state'])).jobs.length,1);
 await resumeManualPicker(project,[],values,jobFile); // Reopening is idempotent.
 await fs.writeFile(jobFile('browser-picking-input.txt'),'different revision');
 await assert.rejects(resumeManualPicker(project,[],values,jobFile),/Micrograph input changed/);
 await fs.writeFile(jobFile('browser-picking-input.txt'),snapshot.revision);
 await assert.rejects(resumeManualPicker(project,[],{...values,do_queue:'Yes'},jobFile),/saved Manual picking settings/);

 await fs.mkdir(path.join(project,started.name,'Movies'),{recursive:true});const temp=path.join(project,'coords.star');await fs.writeFile(temp,coordinateText([{x:1.25,y:.75}]));await adapter.call(['browser-pick-save',started.name,'0',temp]);
 assert.equal((await adapter.call(['state'])).jobs[0].status,'Running');const saved=await pickerCoordinates(project,[],started.name,snapshot.mics[0]);assert.equal(saved.points[0].x,1.25);assert.equal(saved.points[0].y,.75);
 const mapping=parseStar(await fs.readFile(path.join(project,started.name,'manualpick.star'),'utf8')).find(b=>b.name==='coordinate_files').tables[0].rows;assert.equal(mapping[0].rlnMicrographCoordinates,started.name+coordinateName('MotionCorr/job004/Movies/mic.mrc'));
 const micout=parseStar(await fs.readFile(path.join(project,started.name,'micrographs_selected.star'),'utf8'));assert.equal(Number(micout.find(b=>b.name==='optics').tables[0].rows[0].rlnMicrographPixelSize),1.25);
 await fs.writeFile(temp,coordinateText([]));await adapter.call(['browser-pick-save',started.name,'0',temp]);assert.equal((await pickerCoordinates(project,[],started.name,snapshot.mics[0])).points.length,0);
 await adapter.call(['browser-pick-finish',started.name]);assert.equal((await adapter.call(['state'])).jobs[0].status,'Succeeded');await assert.rejects(adapter.call(['browser-pick-save',started.name,'0',temp]),/not running/);
 const helix=await adapter.submit('browser-pick',{id:3,label:'relion.manualpick',name:'Manual picking'},schema,{...values,do_startend:'Yes'},'','');await fs.mkdir(path.join(project,helix.name,'Movies'),{recursive:true});await fs.writeFile(temp,coordinateText([{x:1,y:0},{x:3,y:1}]));await adapter.call(['browser-pick-save',helix.name,'0',temp]);const endpoints=await pickerCoordinates(project,[],helix.name,snapshot.mics[0]);assert.deepEqual(endpoints.points.map(p=>[p.x,p.y]),[[1,0],[3,1]]);await adapter.call(['browser-pick-finish',helix.name]);assert.equal((await adapter.call(['state'])).jobs.find(j=>j.name===helix.name).status,'Succeeded');

 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('Topaz picker invokes native denoising flags, skips filters and cleans temporary output',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'topaz-picker-')),old=process.env.PATH;try{const mock=path.join(p,'relion_python_topaz');await fs.writeFile(mock,`#!/usr/bin/env node
const fs=require('fs'),path=require('path'),a=process.argv.slice(2);fs.writeFileSync('args.json',JSON.stringify(a));fs.copyFileSync(a[1],path.join(a[a.indexOf('--output')+1],path.basename(a[1])));
`,{mode:0o700});process.env.PATH=p+path.delimiter+old;const b=Buffer.alloc(1040);for(const [o,v] of [[0,2],[4,2],[8,1],[12,2]])b.writeInt32LE(v,o);b.writeFloatLE(42,1024);await fs.writeFile(path.join(p,'mic.mrc'),b);const result=await pickerImage(p,[],{file:'mic.mrc',pixel:1},{do_topaz_denoise:'Yes',lowpass:'20',highpass:'10'});assert.equal(result.output.readFloatLE(8),42);const args=JSON.parse(await fs.readFile(path.join(p,'args.json'),'utf8'));assert.deepEqual(args.slice(4),['--device','0','--patch-size','1024','--patch-padding','256','--normalize']);assert.deepEqual(await fs.readdir(path.join(p,'.reliondeluxe')),[]);}finally{process.env.PATH=old;await fs.rm(p,{recursive:true,force:true});}});
test('picker progress logs saved counts and distinguishes filament endpoints',async()=>{const {logPickingProgress}=await import('../lib/browser-picker.mjs');const p=await fs.mkdtemp(path.join(os.tmpdir(),'picking-log-'));try{const job='ManualPick/job001/';await fs.mkdir(path.join(p,job),{recursive:true});await fs.writeFile(path.join(p,job,coordinateName(0)),coordinateText([{x:1,y:2},{x:3,y:4}]));const context={values:{},mics:[{index:0,file:'a.mrc'},{index:1,file:'b.mrc'}]};await logPickingProgress(p,[],job,context,'Saved');let log=await fs.readFile(path.join(p,job,'run.out'),'utf8');assert.match(log,/selected micrographs: 2/);assert.match(log,/saved picks: 1/);assert.match(log,/picked particles: 2/);context.values.do_startend='Yes';await logPickingProgress(p,[],job,context,'Finished');log=await fs.readFile(path.join(p,job,'run.out'),'utf8');assert.match(log,/picked filaments: 1/);}finally{await fs.rm(p,{recursive:true,force:true});}});
test('Autopick manual continuation retains existing coordinates and publishes autopick mapping',{skip:!process.env.RELION_DELUXE_BRIDGE},async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'auto-manual-'));try{const a=new NativeAdapter(p,path.resolve(process.env.RELION_DELUXE_BRIDGE));await a.call(['init']);await fs.writeFile(path.join(p,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 1.2\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\na.mrc 1\nb.mrc 1\n');const s=(await a.call(['schema'])).find(s=>s.id===4),l={id:4,label:'relion.autopick',name:'Auto-picking'},v={fn_input_autopick:'mics.star',do_log:'Yes',do_refs:'No',do_topaz:'No',use_gpu:'No',do_queue:'No',nr_mpi:'1'};const j=await a.submit('schedule',l,s,v,'','');for(const mic of ['a','b'])await fs.writeFile(path.join(p,j.name,mic+'.star'),coordinateText([{x:1,y:2}]));await fs.writeFile(path.join(p,j.name,'autopick.star'),'data_coordinate_files\nloop_\n_rlnMicrographName\n_rlnMicrographCoordinates\na.mrc '+j.name+'a.star\nb.mrc '+j.name+'b.star\n');await a.call(['mark-success',j.name]);await a.submit('browser-pick',l,s,{...v,continue_manual:'Yes'},j.name,'');const mic={index:0,file:'a.mrc',mapping:'autopick.star'};assert.equal((await pickerCoordinates(p,[],j.name,mic)).points.length,1);const tmp=path.join(p,'edit.star');await fs.writeFile(tmp,coordinateText([{x:3,y:4}]));await a.call(['browser-pick-save',j.name,'0',tmp]);const rows=parseStar(await fs.readFile(path.join(p,j.name,'autopick.star'),'utf8')).find(b=>b.name==='coordinate_files').tables[0].rows;assert.equal(rows.length,2);assert.equal(rows[1].rlnMicrographCoordinates,j.name+'b.star');assert.equal((await pickerCoordinates(p,[],j.name,mic)).points[0].x,3);await a.call(['browser-pick-finish',j.name]);assert.equal((await a.call(['state'])).jobs[0].status,'Succeeded');}finally{await fs.rm(p,{recursive:true,force:true});}});

test('native-compatible coordinate paths and five-column STAR output',()=>{
 assert.equal(coordinateName('MotionCorr/job004/Movies/movie.mrc'),'Movies/movie_manualpick.star');
 assert.equal(coordinateName('Movies/movie.mrc'),'Movies/movie_manualpick.star');
 assert.throws(()=>coordinateName('../outside.mrc'),/Unsafe/);
 const table=parseStar(coordinateText([{x:800,y:1115}])).flatMap(b=>b.tables)[0];
 assert.deepEqual(table.labels,['rlnCoordinateX','rlnCoordinateY','rlnParticleSelectionType','rlnAnglePsi','rlnAutopickFigureOfMerit']);
 assert.equal(Number(table.rows[0].rlnParticleSelectionType),2);
 assert.equal(Number(table.rows[0].rlnAnglePsi),-999);
 const helix=parseStar(coordinateText([{x:0,y:0},{x:0,y:10}],true)).flatMap(b=>b.tables)[0];
 assert.deepEqual(helix.rows.map(r=>Number(r.rlnAnglePsi)),[-90,-90]);
 assert.throws(()=>coordinateText([{x:0,y:0}],true),/second click/);
});
test('picker snapshot exposes numeric defocus U and leaves missing/invalid metadata unavailable',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'picker-defocus-'));
 try{
  await fs.writeFile(path.join(project,'mics.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnMicrographPixelSize\n1 1.25\n\ndata_micrographs\nloop_\n_rlnMicrographName\n_rlnOpticsGroup\n_rlnDefocusU\nMovies/a.mrc 1 12345.6\nMovies/b.mrc 1 ?\n');
  const result=await pickerSnapshot(project,[],{fn_in:'mics.star'});
  assert.equal(result.mics[0].defocusU,12345.6);assert.equal(result.mics[1].defocusU,null);
  assert.equal(result.mics[0].file,'Movies/a.mrc');
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('single-frame TIFF picker display uses MRC conversion and removes temporary files',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'picker-tiff-'));
 try{
  const fixtures=new URL('./fixtures/gain-tiff/',import.meta.url);
  const cases=JSON.parse(await fs.readFile(new URL('cases.json',fixtures)));
  const source=await fs.readFile(new URL(cases[0].file,fixtures));
  await fs.writeFile(path.join(project,'mic.tif'),source);
  const result=await pickerImage(project,[],{file:'mic.tif',pixel:3.6},{lowpass:'-1',highpass:'-1'});
  assert.equal(result.nx,cases[0].width);assert.equal(result.ny,cases[0].height);
  assert.deepEqual(await fs.readFile(path.join(project,'mic.tif')),source);
  assert.deepEqual(await fs.readdir(path.join(project,'.reliondeluxe')),[]);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
test('TIFF filtering passes an MRC input to relion_image_handler',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'tiff-filter-')),old=process.env.PATH;
 try{
  const fixture=new URL('./fixtures/gain-tiff/',import.meta.url),cases=JSON.parse(await fs.readFile(new URL('cases.json',fixture)));
  await fs.copyFile(new URL(cases[0].file,fixture),path.join(p,'mic.tiff'));
  await fs.writeFile(path.join(p,'relion_image_handler'),'#!/usr/bin/env node\nconst fs=require("fs"),a=process.argv.slice(2);const i=a[a.indexOf("--i")+1];if(!i.endsWith(".mrc"))process.exit(3);fs.copyFileSync(i,a[a.indexOf("--o")+1]);fs.writeFileSync("filter-args.json",JSON.stringify(a));\n',{mode:0o700});
  process.env.PATH=p+path.delimiter+old;
  await pickerImage(p,[],{file:'mic.tiff',pixel:3.6},{lowpass:'20',highpass:'-1'});
  const args=JSON.parse(await fs.readFile(path.join(p,'filter-args.json'),'utf8'));
  assert.equal(args[args.indexOf('--angpix')+1],'3.6');assert.equal(args[args.indexOf('--lowpass')+1],'20');
  assert.deepEqual(await fs.readdir(path.join(p,'.reliondeluxe')),[]);
 }finally{process.env.PATH=old;await fs.rm(p,{recursive:true,force:true});}
});
test('TIFF raw statistics and save-bound checks use the same dimensions and pixels',async()=>{
 const {pickerRawImage}=await import('../lib/browser-picker.mjs');
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'tiff-raw-'));
 try{
  const dir=new URL('./fixtures/gain-tiff/',import.meta.url),cases=JSON.parse(await fs.readFile(new URL('cases.json',dir)));
  await fs.copyFile(new URL(cases[0].file,dir),path.join(p,'mic.tif'));
  const mic={file:'mic.tif',pixel:3.6},raw=await pickerRawImage(p,[],mic),bounds=await pickerRawImage(p,[],mic,1);
  assert.equal(raw.nx,cases[0].width);assert.equal(raw.ny,cases[0].height);
  assert.equal(bounds.nx,raw.nx);assert.equal(bounds.ny,raw.ny);
  assert.deepEqual(await fs.readdir(path.join(p,'.reliondeluxe')),[]);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
