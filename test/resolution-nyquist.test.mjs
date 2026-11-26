import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {jobInfoEnricher} from '../lib/job-key-info.mjs';
import {nyquistInfo,resolutionNyquistEnricher} from '../lib/resolution-nyquist.mjs';
test('Nyquist tolerance includes beyond-limit values and every optics group',()=>{
 assert.equal(nyquistInfo(2.2,[1]).near,true);
 assert.equal(nyquistInfo(2.21,[1]).near,false);
 assert.equal(nyquistInfo(1.8,[1]).near,true);
 assert.equal(nyquistInfo(3,[1,1.5]).near,true);
 assert.equal(nyquistInfo(999,[1]),null);
 assert.equal(nyquistInfo(3,[NaN]),null);
});
test('traces particle lineage, inherits dominant resolution, refreshes optics and clears missing data',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'nyquist-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const file='Extract/job001/particles.star';await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});
 const write=p=>fs.writeFile(path.join(root,file),`data_optics\nloop_\n_rlnImagePixelSize #1\n${p}\n\ndata_particles\nloop_\n_rlnImageName #1\n1@stack.mrcs\n`);
 await write(1.5);
 const state={nodes:[file,'Select/job002/particles.star'].map(name=>({name,type:'ParticleGroupMetadata.test'})),jobs:[
 {name:'Extract/job001/',type:1,inputs:[],outputs:[file]},
 {name:'Select/job002/',type:2,inputs:[file],outputs:['Select/job002/particles.star']},
 {name:'Class3D/job003/',type:3,inputs:['Select/job002/particles.star'],outputs:[],resolutionAngstrom:3.2},
 {name:'Select/job004/',type:2,inputs:[],outputs:[],resolutionAngstrom:3.2,resolutionSourceJob:'Class3D/job003/'}
 ]};
 const enrich=resolutionNyquistEnricher(root,[{id:1,name:'Particle extraction'}]);
 await enrich(state);assert.equal(state.jobs[2].resolutionNyquist.near,true);assert.equal(state.jobs[3].resolutionNyquist.near,true);
 await write(1);await enrich(state);assert.equal(state.jobs[2].resolutionNyquist.near,false);
 await fs.unlink(path.join(root,file));await enrich(state);assert.equal(state.jobs[2].resolutionNyquist,undefined);
});

test('tutorial rescaled refinement input works without registered particle lineage',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'nyquist-input-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.mkdir(path.join(root,'Select/job007'),{recursive:true});
 await fs.writeFile(path.join(root,'Select/job007/particles.star'),`data_optics
loop_
_rlnOpticsGroup #1
_rlnImagePixelSize #2
_rlnImageSize #3
1 3.54 64

data_particles
loop_
_rlnImageName #1
1@particles.mrcs
`);
 const state={nodes:[],jobs:[{name:'Refine3D/job010/',type:3,inputs:[],outputs:[],resolutionAngstrom:7.30839,resolutionParticleInput:'Select/job007/particles.star'}]};
 await fs.mkdir(path.join(root,'Refine3D/job010'),{recursive:true});
 await fs.writeFile(path.join(root,'Refine3D/job010/job.star'),`data_joboptions
loop_
_rlnJobOptionVariable
_rlnJobOptionValue
fn_img Select/job007/particles.star
fn_mask ''
`);
 await fs.writeFile(path.join(root,'Refine3D/job010/run.out'),'Final resolution (without masking) is: 7.30839');
 await resolutionNyquistEnricher(root,[{id:1,name:'Particle extraction'}])(state);
 assert.equal(state.jobs[0].resolutionNyquist.near,true);
 assert.equal(state.jobs[0].resolutionNyquist.limit,7.08);
 delete state.jobs[0].resolutionParticleInput;
 state.jobs[0].status='Succeeded';
 await jobInfoEnricher(root,[{id:1,name:'Particle extraction'},{id:3,name:'3D auto-refine'}])(state);
 assert.equal(state.jobs[0].resolutionParticleInput,'Select/job007/particles.star');
 assert.equal(state.jobs[0].resolutionNyquist.near,true);
});

test('STA refinement follows optimisation-set particle optics and direct entries',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'nyquist-sta-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 for(const folder of ['Extract/job001','Class3D/job002','Refine3D/job003'])await fs.mkdir(path.join(root,folder),{recursive:true});
 const particles='Extract/job001/particles.star',optimisation='Extract/job001/optimisation_set.star';
 const write=p=>fs.writeFile(path.join(root,particles),`data_optics\nloop_\n_rlnOpticsGroup\n_rlnImagePixelSize\n_rlnTomoTiltSeriesPixelSize\n_rlnTomoSubtomogramBinning\n1 ${p} 0.675 4\n\ndata_particles\nloop_\n_rlnImageName\n1@stack.mrcs\n`);
 await write(2.7);
 await fs.writeFile(path.join(root,optimisation),`data_optimisation_set\n_rlnTomoParticlesFile ${particles}\n`);
 const state={nodes:[],jobs:[{name:'Class3D/job002/',type:9,status:'Succeeded',inputs:[],outputs:[]},{name:'Refine3D/job003/',type:10,status:'Succeeded',inputs:[],outputs:[]}]};
 for(const job of state.jobs){
 const input=job.type===9?`use_direct_entries No\nin_optimisation ${optimisation}`:`use_direct_entries Yes\nin_particles ${particles}`;
 await fs.writeFile(path.join(root,job.name,'job.star'),`data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\n${input}\n`);
 await fs.writeFile(path.join(root,job.name,'run.out'),job.type===9?'CurrentResolution= 5.6 Angstroms':'Final resolution (without masking) is: 5.6');
 }
 const enrich=jobInfoEnricher(root,[{id:51,name:'Extract subtomos'},{id:9,name:'3D classification'},{id:10,name:'3D auto-refine'}]);
 await enrich(state);
 for(const job of state.jobs){assert.equal(job.resolutionNyquist.limit,5.4);assert.equal(job.resolutionNyquist.near,true);}
 await write(1.35);await enrich(state);
 for(const job of state.jobs){assert.equal(job.resolutionNyquist.limit,2.7);assert.equal(job.resolutionNyquist.near,false);}
 // A missing particle file must not retain an obsolete warning.
 await fs.unlink(path.join(root,particles));await enrich(state);
 for(const job of state.jobs)assert.equal(job.resolutionNyquist,undefined);
});
