import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {postprocessDependencies} from '../lib/postprocess-dependencies.mjs';
import {jobConnections} from '../public/job-connections.js';
test('undeclared fn_post edges survive refresh and follow edited settings',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'post-deps-'));
 try{
  for(const dir of ['CtfRefine/job022','Polish/job023']){await fs.mkdir(path.join(project,dir),{recursive:true});await fs.writeFile(path.join(project,dir,'job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable #1\n_rlnJobOptionValue #2\nfn_post PostProcess/final/postprocess.star\n');}
  const state=()=>({jobs:[{name:'PostProcess/job021/',alias:'PostProcess/final/',type:15,outputs:[]},{name:'CtfRefine/job022/',type:21,inputs:[]},{name:'Polish/job023/',type:20,inputs:[]}]});
  const enrich=postprocessDependencies(project);
  for(let n=0;n<2;n++){const result=await enrich(state());assert.equal(jobConnections(result.jobs).length,2);assert.deepEqual(result.jobs[0].outputs,['PostProcess/job021/postprocess.star']);}
  await fs.writeFile(path.join(project,'CtfRefine/job022/job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable #1\n_rlnJobOptionValue #2\nfn_post ""\n');
  assert.equal(jobConnections((await enrich(state())).jobs).length,1);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('polishing includes motion-correction input alongside postprocess, without duplicate arrows',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'polish-deps-'));
 try{
  await fs.mkdir(path.join(project,'Polish/job004'),{recursive:true});
  await fs.writeFile(path.join(project,'Polish/job004/job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nfn_post PostProcess/job003/postprocess.star\nfn_mic MotionCorr/corrected/corrected_micrographs.star\n');
  const state=()=>({jobs:[
   {name:'MotionCorr/job002/',alias:'MotionCorr/corrected/',type:1,outputs:[]},
   {name:'PostProcess/job003/',type:15,outputs:[]},
   {name:'Polish/job004/',type:20,inputs:['MotionCorr/corrected/corrected_micrographs.star']}
  ]});
  const enrich=postprocessDependencies(project);
  for(let i=0;i<2;i++){
   const result=await enrich(state()),edges=jobConnections(result.jobs);
   assert.equal(edges.length,2);
   assert.deepEqual(result.jobs[0].outputs,['MotionCorr/job002/corrected_micrographs.star']);
   assert.equal(result.jobs[2].inputs.length,2);
  }
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Topaz picking adds the training-model dependency only in active picking mode',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'topaz-deps-'));
 try{
  await fs.mkdir(path.join(project,'AutoPick/job009'),{recursive:true});
  const file=path.join(project,'AutoPick/job009/job.star');
  const write=mode=>fs.writeFile(file,'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_topaz '+mode+'\ndo_topaz_pick Yes\ntopaz_model AutoPick/trained/model_epoch10.sav\n'.replaceAll('\\n','\n'));
  const state=()=>({jobs:[{name:'AutoPick/job008/',alias:'AutoPick/trained/',type:4,inputs:[],outputs:[]},{name:'AutoPick/job009/',type:4,inputs:[],outputs:[]}]});
  const enrich=postprocessDependencies(project);
  await write('Yes');
  const result=await enrich(state());assert.equal(jobConnections(result.jobs).length,1);assert.deepEqual(result.jobs[0].outputs,['AutoPick/job008/model_epoch10.sav']);
  await write('No');assert.equal(jobConnections((await enrich(state())).jobs).length,0);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('Local resolution fn_in connects DynaMight half maps, aliases and absolute paths',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'localres-deps-'));
 try{
  await fs.mkdir(path.join(project,'LocalRes/job037'),{recursive:true});
  const file=path.join(project,'LocalRes/job037/job.star'),map='DynaMight/job036/backprojection/map_half1.mrc';
  const state=()=>({jobs:[{name:'DynaMight/job036/',alias:'DynaMight/flexible/',type:23,inputs:[],outputs:[map]},{name:'LocalRes/job037/',type:16,inputs:[],outputs:[]}]});
  const enrich=postprocessDependencies(project);
  for(const input of [map,'DynaMight/flexible/backprojection/map_half1.mrc',path.join(project,map)]){
   await fs.writeFile(file,'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nfn_in "'+input+'"\n');
   for(let n=0;n<2;n++){
    const result=await enrich(state()),edges=jobConnections(result.jobs);
    assert.equal(edges.length,1);assert.equal(edges[0].source,'DynaMight/job036/');assert.equal(edges[0].target,'LocalRes/job037/');
    assert.deepEqual(result.jobs[0].outputs,[map]);
   }
  }
  await fs.writeFile(file,'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\nfn_in ""\n');
  assert.equal(jobConnections((await enrich(state())).jobs).length,0);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});

test('polishing training parameter dependency follows active Polish mode',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'train-deps-'));
 try{
  await fs.mkdir(path.join(project,'Polish/job041'),{recursive:true});
  const enrich=postprocessDependencies(project);
  for(const [polish,own,count] of [['Yes','No',1],['No','No',0],['Yes','Yes',0]]){
   await fs.writeFile(path.join(project,'Polish/job041/job.star'),'data_joboptions\nloop_\n_rlnJobOptionVariable\n_rlnJobOptionValue\ndo_polish '+polish+'\ndo_own_params '+own+'\nopt_params Polish/job040/opt_params_all_groups.txt\n');
   const state={jobs:[{name:'Polish/job040/',type:20,inputs:[],outputs:[]},{name:'Polish/job041/',type:20,inputs:[],outputs:[]}]};
   assert.equal(jobConnections((await enrich(state)).jobs).length,count);
  }
 }finally{await fs.rm(project,{recursive:true,force:true});}
});


test('Topaz training connects only its active particle or coordinate source',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'topaz-training-deps-'));
 try{
  await fs.mkdir(path.join(project,'AutoPick/job009'),{recursive:true});
  const enrich=postprocessDependencies(project);
  for(const [topaz,train,parts,source] of [['Yes','Yes','Yes','Select/job008/'],['Yes','Yes','No','ManualPick/job007/'],['No','Yes','Yes',null],['Yes','No','Yes',null]]){
   await fs.writeFile(path.join(project,'AutoPick/job009/job.star'),`data_joboptions
loop_
_rlnJobOptionVariable
_rlnJobOptionValue
do_topaz ${topaz}
do_topaz_train ${train}
do_topaz_train_parts ${parts}
topaz_train_parts Select/training/particles.star
topaz_train_picks ManualPick/job007/manualpick.star
`);
   const state=()=>({jobs:[{name:'Select/job008/',alias:'Select/training/',type:7,inputs:[],outputs:['Select/job008/particles.star']},{name:'ManualPick/job007/',type:3,inputs:[],outputs:['ManualPick/job007/manualpick.star']},{name:'AutoPick/job009/',type:4,inputs:[],outputs:[]}]});
   for(let i=0;i<2;i++){
    const result=await enrich(state()),edges=jobConnections(result.jobs);
    assert.equal(edges.length,source?1:0);
    if(source){assert.equal(edges[0].source,source);assert.equal(edges[0].target,'AutoPick/job009/');}
   }
  }
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
