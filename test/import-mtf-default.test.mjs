import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {importMtfDefault} from '../lib/import-mtf-default.mjs';
import {sequentialDefaults} from '../lib/sequential-defaults.mjs';

async function project(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mtf-default-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
const spa=[{id:0,name:'Import'}],sta=[{id:50,name:'Import tilt series'}],state={jobs:[],nodes:[]};

test('a mixed-case MTF filename in canonical folders fills SPA and STA Import fields',async t=>{
 for(const folder of ['', 'Movies','Micrographs','frames','mdoc']){
  const root=await project(t);if(folder)await fs.mkdir(path.join(root,folder));
  const relative=path.join(folder,'Camera_MtF_2026.StAr');await fs.writeFile(path.join(root,relative),'data_mtf');
  const expected=folder?relative:'Camera_MtF_2026.StAr';
  assert.equal(await importMtfDefault(root),expected);
  assert.equal((await sequentialDefaults(root,[],state,spa,[],0)).fn_mtf,expected);
  assert.equal((await sequentialDefaults(root,[],state,sta,[],50)).mtf_file,expected);
 }
});

test('the MTF default accompanies existing image detection and root files take precedence',async t=>{
 const root=await project(t);await fs.mkdir(path.join(root,'Movies'));
 await fs.writeFile(path.join(root,'Movies','one.tiff'),'');
 await fs.writeFile(path.join(root,'Movies','nested_mtf.star'),'');
 await fs.writeFile(path.join(root,'detector_MTF.star'),'');
 assert.deepEqual(await sequentialDefaults(root,[],state,spa,[],0),{fn_mtf:'detector_MTF.star',fn_in_raw:'Movies/*.tiff'});
});

test('ambiguous matches, directories and unrelated STAR files do not set a default',async t=>{
 const root=await project(t);await fs.mkdir(path.join(root,'Movies'));
 await fs.writeFile(path.join(root,'Movies','a_mtf.star'),'');
 await fs.writeFile(path.join(root,'Movies','b_MTF.STAR'),'');
 await fs.writeFile(path.join(root,'Movies','other.star'),'');
 await fs.mkdir(path.join(root,'Movies','directory_mtf.star'));
 assert.equal(await importMtfDefault(root),null);
 assert.deepEqual(await sequentialDefaults(root,[],state,spa,[],0),{});
});

test('linked MTF files require an allowed read root',async t=>{
 const root=await project(t),outside=await project(t);
 await fs.mkdir(path.join(root,'frames'));
 await fs.writeFile(path.join(outside,'camera_mtf.star'),'');
 await fs.symlink(path.join(outside,'camera_mtf.star'),path.join(root,'frames','camera_mtf.star'));
 assert.equal(await importMtfDefault(root),null);
 assert.equal(await importMtfDefault(root,[outside]),'frames/camera_mtf.star');
});
