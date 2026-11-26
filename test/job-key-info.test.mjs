import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {keyInfo} from '../lib/job-key-info.mjs';import {projectDirectory} from '../lib/project-directory.mjs';
test('project creation requires consent and rejects regular files',async()=>{const dir=await fs.mkdtemp(path.resolve('project-test-'));try{const target=path.join(dir,'new');await assert.rejects(projectDirectory(target,{confirm:async()=>false}),/cancelled/);await assert.rejects(fs.stat(target),{code:'ENOENT'});assert.equal(await projectDirectory(target,{confirm:async()=>true}),target);assert.equal(await projectDirectory(target,{confirm:()=>{throw Error('unexpected prompt');}}),target);await fs.writeFile(path.join(dir,'file'),'');await assert.rejects(projectDirectory(path.join(dir,'file')),/not a directory/);}finally{await fs.rm(dir,{recursive:true,force:true});}});
test('job summaries use settings and last matching native/browser log results',()=>{assert.equal(keyInfo('Import',{do_raw:'Yes',fn_in_raw:'Movies/*.tif'}),'');assert.equal(keyInfo('Motion correction',{bin_factor:'2'}),'bin: 2');assert.equal(keyInfo('2D classification',{nr_classes:'50'}),'50 classes');assert.equal(keyInfo('Manual picking',{},'Total number of picked particles: 12 from 2 selected micrographs.\nTotal number of picked particles: 23 from 3 selected micrographs.\nDone'),'23 particles');assert.equal(keyInfo('Subset selection',{},'Saved particles.star with 125 selected particles.'),'125 particles');assert.equal(keyInfo('Subset selection',{},'Browser selection saved 3 selected images and 100 output rows.'),'100 particles');assert.equal(keyInfo('3D auto-refine',{},'Auto-refine: + Final resolution (without masking) is: 3.12\nDone'),'3.12 Å');assert.equal(keyInfo('Post-processing',{},'+ FINAL RESOLUTION: 2.5 (2.48)'),'2.5 Å');assert.equal(keyInfo('3D auto-refine',{},'Still running'),'');});

test('extraction summary uses final particle total and actual output box size',()=>{
 const log='Written out STAR file with 5000 particles in Extract/job014/particles.star\nWritten out STAR file with 4286 particles in Extract/job014/particles.star\nDone';
 assert.equal(keyInfo('Particle extraction',{extract_size:'512',rescale:'256',do_rescale:'Yes'},log),'4286 particles 256px(scaled)');
 assert.equal(keyInfo('Particle extraction',{extract_size:'512',rescale:'256',do_rescale:'No'},log),'4286 particles 512px');
 assert.equal(keyInfo('Particle extraction',{extract_size:'512'},'Extracting particles from 100 micrographs'),'');
});

test('picking modes, 3D classes and anisotropy summaries',()=>{assert.equal(keyInfo('Auto-picking',{do_log:'Yes'}),'LoG');assert.equal(keyInfo('Auto-picking',{do_refs:'Yes'}),'References');assert.equal(keyInfo('Auto-picking',{do_topaz:'Yes',do_topaz_train:'Yes'}),'TopazTrain');assert.equal(keyInfo('Auto-picking',{do_topaz:'Yes',do_topaz_pick:'Yes'}),'TopazPick');assert.equal(keyInfo('3D classification',{nr_classes:'6'}),'6 classes');const log="Magnification anisotropy of optics group #1 named 'opticsGroup1': 0.58432 %";assert.equal(keyInfo('CTF refinement',{do_aniso_mag:'Yes'},log),'0.584%');assert.equal(keyInfo('CTF refinement',{do_aniso_mag:'No'},log),'');assert.equal(keyInfo('CTF refinement',{do_aniso_mag:'Yes'},log+"\nMagnification anisotropy of optics group #2 named 'group2': 1.1236 %"),'#1: 0.584% · #2: 1.124%');});

test('Bayesian polishing modality',()=>{
 assert.equal(keyInfo('Bayesian polishing',{do_param_optim:'Yes',do_polish:'No'}),'Train');
 assert.equal(keyInfo('Bayesian polishing',{do_param_optim:'No',do_polish:'Yes'}),'Polish');
 assert.equal(keyInfo('Bayesian polishing',{}),'');
});

test('Topaz picking count uses last native or manual-cleanup total only in pick mode',()=>{
 const v={do_topaz:'Yes',do_topaz_pick:'Yes',do_topaz_train:'No'};
 assert.equal(keyInfo('Auto-picking',v,' Total number of particles from 24 micrographs is 21951'),'21951 particles TopazPick');
 assert.equal(keyInfo('Auto-picking',v,'Total number of particles from 24 micrographs is 21951\nTotal number of picked particles: 19838'),'19838 particles TopazPick');
 assert.equal(keyInfo('Auto-picking',v,'Total number of picked particles: 0'),'0 particles TopazPick');
 assert.equal(keyInfo('Auto-picking',{...v,do_topaz_train:'Yes'},'Total number of picked particles: 19838'),'TopazTrain');
 assert.equal(keyInfo('Auto-picking',{do_log:'Yes'},'Total number of picked particles: 19838'),'19838 particles LoG');
});

test('LoG counts use latest total including zero and manual cleanup',()=>{
 assert.equal(keyInfo('Auto-picking',{do_log:'Yes'},'Total number of particles from 24 micrographs is 5593'),'5593 particles LoG');
 assert.equal(keyInfo('Auto-picking',{do_log:'Yes'},'Total number of particles from 24 micrographs is 5593\nTotal number of picked particles: 5006'),'5006 particles LoG');
 assert.equal(keyInfo('Auto-picking',{do_log:'Yes'},'Total number of picked particles: 0'),'0 particles LoG');
});

test('duplicate removal reports retained particles from the latest summary',()=>{
 const v={do_remove_duplicates:'Yes'};
 assert.equal(keyInfo('Subset selection',v,'Removed 7701 duplicated objects from 19336 objects.'),'11635 particles');
 assert.equal(keyInfo('Subset selection',v,'Removed 2 duplicated objects from 10 objects.\nRemoved 4 duplicated objects from 4 objects.'),'0 particles');
 assert.equal(keyInfo('Subset selection',v,'Removed 0 duplicated objects from 25 objects.'),'25 particles');
 assert.equal(keyInfo('Subset selection',v,'Removed 9 duplicated objects from 3 objects.'),'');
});

test('STA subtomogram extraction summary uses saved real-valued binning',()=>{
 assert.equal(keyInfo('Extract subtomos',{binning:'4'}),'bin: 4');
 assert.equal(keyInfo('Extract subtomos',{binning:'1.5'}),'bin: 1.5');
 assert.equal(keyInfo('Extract subtomos',{}),'');
});

test('STA alignment method and reconstruction count',()=>{
 for(const [key,label] of [['do_imod_fiducials','IMOD fidu'],['do_imod_patchtrack','IMOD patch'],['do_aretomo2','AreTomo']])assert.equal(keyInfo('Align tilt-series',{[key]:'Yes'}),label);
 assert.equal(keyInfo('Align tilt-series',{}),'');
 assert.equal(keyInfo('Reconstruct tomograms',{},' + Reconstructing 1 tomograms:\nDone'),'1 tomogram');
 assert.equal(keyInfo('Reconstruct tomograms',{},' + Reconstructing 5 tomograms:\n + Reconstructing 2 tomograms:\nDone'),'2 tomograms');
 assert.equal(keyInfo('Reconstruct tomograms',{},' + Reconstructing ...'),'');
});
