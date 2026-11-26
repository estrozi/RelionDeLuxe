import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {nearestExtractions,diameterFromOptics,maskDefault} from '../lib/mask-default.mjs';
import {NativeAdapter} from '../lib/native.mjs';
const bridge=process.env.RELION_DELUXE_BRIDGE;
function graph(){
 const jobs=[
  {name:'Extract/job001/',type:5,alias:'Extract/first/',inputs:[],outputs:['Extract/job001/particles.star']},
  {name:'Class2D/job002/',type:8,alias:'None',inputs:['Extract/job001/particles.star'],outputs:['Class2D/job002/run_data.star']},
  {name:'Select/job003/',type:7,alias:'Select/chosen/',inputs:['Class2D/job002/run_data.star'],outputs:['Select/job003/particles.star']},
  {name:'Extract/job004/',type:5,alias:'None',inputs:['Select/job003/particles.star'],outputs:['Extract/job004/particles.star']},
  {name:'JoinStar/job005/',type:13,alias:'None',inputs:['Extract/job001/particles.star','Extract/job004/particles.star'],outputs:['JoinStar/job005/particles.star']}
 ];return {jobs,nodes:jobs.flatMap(j=>j.outputs.map(name=>({name,type:'ParticleGroupMetadata.star.relion'})))};
}
test('Mask defaults follow nearest particle ancestry through selection, re-extraction and joins',()=>{
 const state=graph();
 assert.deepEqual(nearestExtractions(state,'Select/chosen/particles.star',5).map(j=>j.name),['Extract/job001/']);
 assert.deepEqual(nearestExtractions(state,'Extract/job004/particles.star',5).map(j=>j.name),['Extract/job004/']);
 assert.equal(nearestExtractions(state,'JoinStar/job005/particles.star',5).length,2);
 state.jobs[1].inputs.push('Extract/job004/reference.mrc');state.nodes.push({name:'Extract/job004/reference.mrc',type:'DensityMap.mrc'});state.jobs[3].outputs.push('Extract/job004/reference.mrc');
 assert.equal(nearestExtractions(state,'Select/job003/particles.star',5)[0].name,'Extract/job001/');
 assert.deepEqual(nearestExtractions(state,'unregistered.star',5),[]);
});
test('Mask diameter uses image pixel size times box size minus four and rejects ambiguous optics',()=>{
 assert.equal(diameterFromOptics([{pixelSize:1.276,boxSize:256}]),1.276*252);
 assert.equal(diameterFromOptics([{pixelSize:2,boxSize:100},{pixelSize:1,boxSize:196}]),192);
 assert.throws(()=>diameterFromOptics([{pixelSize:1,boxSize:100},{pixelSize:2,boxSize:100}]),/different/);
 for(const rows of [[],[{pixelSize:0,boxSize:256}],[{pixelSize:1,boxSize:4}]])assert.throws(()=>diameterFromOptics(rows));
});
test('Native STAR optics supply extraction defaults with missing-data and branch-conflict fallback',{skip:!bridge},async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'relion-mask-')),adapter=new NativeAdapter(project,path.resolve(bridge));
 try{
  const state=graph();
  async function write(job,pixel,box){await fs.mkdir(path.join(project,job),{recursive:true});await fs.writeFile(path.join(project,job,'particles.star'),`data_optics\nloop_\n_rlnOpticsGroup #1\n_rlnImagePixelSize #2\n_rlnImageSize #3\n1 ${pixel} ${box}\n\ndata_particles\nloop_\n_rlnImageName #1\n_rlnOpticsGroup #2\n1@particles.mrcs 1\n`);}
  await write('Extract/job001/',1.276,256);await write('Extract/job004/',2,128);
  const r=await maskDefault(project,[],adapter,state,'Select/job003/particles.star',5);assert.equal(r.diameter,'321.552');assert.equal(r.sources[0].file,'Extract/job001/particles.star');
  assert.equal((await maskDefault(project,[],adapter,state,'Extract/job004/particles.star',5)).diameter,'248');
  assert.match((await maskDefault(project,[],adapter,state,'JoinStar/job005/particles.star',5)).reason,/different/);
  await fs.unlink(path.join(project,'Extract/job001/particles.star'));assert.equal((await maskDefault(project,[],adapter,state,'Select/job003/particles.star',5)).diameter,null);
  await fs.writeFile(path.join(project,'Extract/job001/particles.star'),'data_optics\nloop_\n_rlnOpticsGroup #1\n1\n');assert.equal((await maskDefault(project,[],adapter,state,'Select/job003/particles.star',5)).diameter,null);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
