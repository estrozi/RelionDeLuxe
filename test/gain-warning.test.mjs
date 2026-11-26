import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gainWarning} from '../lib/gain-warning.mjs';
import {ProjectDefaults,initialDefaults} from '../lib/project-defaults.mjs';
import {gainTiffToMrc} from '../lib/gain-tiff.mjs';
import {motionGainReference} from '../lib/motion-gain.mjs';
import {preflight} from '../lib/preflight.mjs';
test('empty gain warns, finds case-insensitive image candidates but never auto-selects',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gainwarn-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const f of ['GAIN.mrc','detector_gain.tiff','gain_notes.txt','image.mrc'])await fs.writeFile(path.join(root,f),'');
 const layout={name:'Motion correction',tabs:{Motion:['fn_gain_ref']}},values={fn_gain_ref:''};
 const result=await gainWarning(root,[],layout,values);
 assert.deepEqual(result.gainCandidates,['detector_gain.tiff','GAIN.mrc']);
 assert.match(result.message,/Motion tab/);assert.equal(values.fn_gain_ref,'');
 assert.equal(await gainWarning(root,[],layout,{fn_gain_ref:'GAIN.mrc'}),null);
 assert.equal(await gainWarning(root,[],{name:'Import'},values),null);
 assert.equal(initialDefaults.nr_pool,'30');
});

test('pooled-particle fresh default is 30 while saved project choice is preserved',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'pooldefault-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const d=new ProjectDefaults(root,true);
 assert.equal((await d.read()).nr_pool,'30');
 await d.write({nr_pool:'12'});assert.equal((await d.read()).nr_pool,'12');
});
test('gain search includes first raw Import folder, respects read roots and deduplicates',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'importgain-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Movies'));await fs.mkdir(path.join(root,'Later'));
 await fs.writeFile(path.join(root,'Movies','Detector_GAIN.mrc'),'');
 await fs.writeFile(path.join(root,'Later','gain.tif'),'');
 const state={jobs:[{type:0,name:'Import/job003/'},{type:0,name:'Import/job001/'},{type:0,name:'Import/job002/'}]};
 const adapter={call:async([,name])=>({values:name.includes('001')?{do_raw:'No'}:{do_raw:'Yes',fn_in_raw:name.includes('002')?'Movies/*.tiff':'Later/*.tif'}})};
 const result=await gainWarning(root,[],{name:'Motion correction'},{},{state,adapter});
 assert.deepEqual(result.gainCandidates,['Movies/Detector_GAIN.mrc']);
 const external=await fs.mkdtemp(path.join(os.tmpdir(),'outsidegain-'));t.after(()=>fs.rm(external,{recursive:true,force:true}));await fs.writeFile(path.join(external,'gain.mrc'),'');
 const other={call:async()=>({values:{do_raw:'Yes',fn_in_raw:path.join(external,'*.tiff')}})};
 assert.deepEqual((await gainWarning(root,[],{name:'Motion correction'},{},{state,adapter:other})).gainCandidates,[]);
 assert.deepEqual((await gainWarning(root,[external],{name:'Motion correction'},{},{state,adapter:other})).gainCandidates,[path.join(external,'gain.mrc')]);
});
test('STA searches movie_files folder and warns when empty',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sta-gain-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'frames'));await fs.writeFile(path.join(root,'frames','Gain.mrc'),'');
 const state={jobs:[{type:50,name:'Import/job001/'}]},adapter={call:async()=>({values:{movie_files:'frames/*.tiff'}})};
 const result=await gainWarning(root,[],{name:'Motion correction',mode:'tomo'},{},{state,adapter});
 assert.equal(result.severity,'warning');assert.deepEqual(result.gainCandidates,['frames/Gain.mrc']);
 assert.equal(await gainWarning(root,[],{name:'Motion correction',mode:'tomo'},{fn_gain_ref:'frames/Gain.mrc'},{state,adapter}),null);
});
test('SPA and STA default only an unambiguous candidate using saved import settings',async t=>{
 const {sequentialDefaults}=await import('../lib/sequential-defaults.mjs');
 for(const mode of ['spa','tomo']){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'gain-default-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Import/job001'),{recursive:true});await fs.mkdir(path.join(root,'frames'));
 await fs.writeFile(path.join(root,'Import/job001/job.star'),'data_\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_raw Yes\nfn_in_raw frames/*.tiff\nmovie_files frames/*.tiff\n');
 await fs.writeFile(path.join(root,'frames','gain.mrc'),gainTiffToMrc(await fs.readFile(new URL('./fixtures/gain-tiff/big-endian.tif',import.meta.url))));
 const state={jobs:[{type:mode==='tomo'?50:0,name:'Import/job001/'}],nodes:[]},layout=[{id:1,name:'Motion correction',mode}],catalog=[{id:1,options:[]}];
 assert.equal((await sequentialDefaults(root,[],state,layout,catalog,1)).fn_gain_ref,'frames/gain.mrc');
 await fs.writeFile(path.join(root,'gain_other.mrc'),'');
 assert.equal((await sequentialDefaults(root,[],state,layout,catalog,1)).fn_gain_ref,undefined);
 }
});
test('a detected TIFF gain becomes a reusable MRC default without changing the source',async t=>{
 const {sequentialDefaults}=await import('../lib/sequential-defaults.mjs');
 for(const mode of ['spa','tomo']){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'gain-convert-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  await fs.mkdir(path.join(root,'Import/job001'),{recursive:true});await fs.mkdir(path.join(root,'frames'));
  await fs.writeFile(path.join(root,'Import/job001/job.star'),'data_\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_raw Yes\nfn_in_raw frames/*.tiff\nmovie_files frames/*.tiff\n');
  const source=await fs.readFile(new URL('./fixtures/gain-tiff/big-endian.tif',import.meta.url));
  await fs.writeFile(path.join(root,'frames','detector_gain.tif'),source);
  const state={jobs:[{type:mode==='tomo'?50:0,name:'Import/job001/'}],nodes:[]},layout=[{id:1,name:'Motion correction',mode}],catalog=[{id:1,options:[]}];
  const first=(await sequentialDefaults(root,[],state,layout,catalog,1)).fn_gain_ref;
  assert.match(first,/^\.reliondeluxe\/converted-gains\/[a-f0-9]{64}\.mrc$/);
  assert.deepEqual(await fs.readFile(path.join(root,first)),gainTiffToMrc(source));
  assert.deepEqual(await fs.readFile(path.join(root,'frames','detector_gain.tif')),source);
  assert.equal((await sequentialDefaults(root,[],state,layout,catalog,1)).fn_gain_ref,first);
  assert.equal(await motionGainReference(root,[],'frames/detector_gain.tif',{convert:false}),null);
 }
});
test('motion correction refuses a directly entered TIFF gain before native submission',async()=>{
 await assert.rejects(preflight({project:'.',layout:{name:'Motion correction'},schema:{options:[]},values:{fn_gain_ref:'frames/gain.tif'},adapter:{call:async()=>{throw Error('native preview was called');}}}),/requires an MRC gain reference/);
});
