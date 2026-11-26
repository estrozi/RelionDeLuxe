import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';
import {importFolderDefault} from '../lib/import-folder-default.mjs';
async function fixture(t,folders){const p=await fs.mkdtemp(path.join(os.tmpdir(),'raw-default-'));t.after(()=>fs.rm(p,{recursive:true,force:true}));for(const [dir,names] of Object.entries(folders)){await fs.mkdir(path.join(p,dir));for(const name of names)await fs.writeFile(path.join(p,dir,name),'');}return p;}
test('one folder and uniform supported extension',async t=>{for(const [folder,ext] of [['Movies','tif'],['Micrographs','mrc'],['Movies','TIFF']]){const p=await fixture(t,{[folder]:['one.'+ext,'two.'+ext]});assert.equal(await importFolderDefault(p),folder+'/*.'+ext);}});
test('case-insensitive detection covers mixed-case filenames',async t=>{const p=await fixture(t,{Movies:['one.tIf','two.TIF']});assert.equal(await importFolderDefault(p),'Movies/*.[tT][iI][fF]');});
test('ambiguous, empty or unsupported folders do not suggest a path',async t=>{for(const folders of [{},{Movies:[]},{Movies:['a.tif'],Micrographs:[]},{Movies:['a.tif','b.tiff']},{Movies:['a.mrcs']}])assert.equal(await importFolderDefault(await fixture(t,folders)),null);});
test('external linked folder requires an allowed read root',async t=>{const p=await fixture(t,{}),outside=await fixture(t,{data:['a.tiff']});await fs.symlink(path.join(outside,'data'),path.join(p,'Movies'));assert.equal(await importFolderDefault(p),null);assert.equal(await importFolderDefault(p,[outside]),'Movies/*.tiff');});

test('Import gets the suggestion without a preceding Screening job',async t=>{const p=await fixture(t,{Micrographs:['a.mrc']});assert.deepEqual(await sequentialDefaults(p,[],{jobs:[]},[{id:0,name:'Import'}],[],0),{fn_in_raw:'Micrographs/*.mrc'});});

test('unrelated sidecar files do not prevent detection',async t=>assert.equal(await importFolderDefault(await fixture(t,{Movies:['a.mrc','notes.txt','preview.jpg']})),'Movies/*.mrc'));

test('dominant supported extension wins despite other image formats and sidecars',async t=>{
 const p=await fixture(t,{Movies:['one.tiff','two.tiff','three.tiff','gain.mrc','preview.tif','notes.txt','image.jpg','stack.mrcs']});
 assert.equal(await importFolderDefault(p),'Movies/*.tiff');
 assert.deepEqual(await sequentialDefaults(p,[],{jobs:[]},[{id:0,name:'Import'}],[],0),{fn_in_raw:'Movies/*.tiff'});
});
test('dominance counts case variants together and ignores nested folders',async t=>{
 const p=await fixture(t,{Micrographs:['one.MRC','two.mrc','three.Mrc','gain.tiff']});
 await fs.mkdir(path.join(p,'Micrographs','nested.tiff'));
 assert.equal(await importFolderDefault(p),'Micrographs/*.[mM][rR][cC]');
});
test('tied supported extension counts do not guess',async t=>{
 const p=await fixture(t,{Movies:['one.tif','two.tif','one.mrc','two.mrc','note.txt']});
 assert.equal(await importFolderDefault(p),null);
});
test('STA frames folder detects TIFF despite unrelated sidecar files',async t=>{
 const p=await fixture(t,{frames:['one.tiff','two.tiff','notes.txt','one.mdoc']});
 const defaults=await sequentialDefaults(p,[],{jobs:[],nodes:[]},[{id:50,name:'Import tilt series'}],[],50);
 assert.deepEqual(defaults,{movie_files:'frames/*.tiff'});
});
test('STA ambiguous raw folders retain existing defaults',async t=>{
 const p=await fixture(t,{frames:['one.tiff'],Movies:['two.mrc']});
 assert.deepEqual(await sequentialDefaults(p,[],{jobs:[],nodes:[]},[{id:50,name:'Import tilt series'}],[],50),{});
});
