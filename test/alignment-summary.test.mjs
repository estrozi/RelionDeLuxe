import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {alignmentSummary,alignmentSummaryEnricher} from '../lib/alignment-summary.mjs';
test('alignment summary pools all tilt rows and appends once only after success',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'zrot-')),name='AlignTiltSeries/job003/',dir=path.join(root,name),layout=[{id:53,name:'Align tilt-series'}];
 try{
  await fs.mkdir(path.join(dir,'tilt_series'),{recursive:true});
  for(const [file,values] of [['a',[1,3]],['b',[5,'?', 'nan']]])await fs.writeFile(path.join(dir,'tilt_series',file+'.star'),'data_\nloop_\n_rlnTomoZRot\n'+values.join('\n')+'\n');
  const summary=await alignmentSummary(root,[],name);
  assert.match(summary,/mean = 3.000000°/);assert.match(summary,/stddev = 1.632993°/);assert.match(summary,/3 tilt rows across 2 tomograms/);
  const out=path.join(dir,'run.out');await fs.writeFile(out,'original stdout');
  const enrich=alignmentSummaryEnricher(root,[],layout),state={jobs:[{name,type:53,status:'Running'}]};
  await enrich(state);assert.equal(await fs.readFile(out,'utf8'),'original stdout');
  state.jobs[0].status='Succeeded';await enrich(state);await enrich(state);
  await alignmentSummaryEnricher(root,[],layout)(state);
  assert.equal(await fs.readFile(out,'utf8'),'original stdout\n'+summary+'\n');
  // A rerun truncates the original log; the new result must receive a summary.
  await fs.writeFile(out,'rerun\n');await enrich(state);
  assert.equal(await fs.readFile(out,'utf8'),'rerun\n'+summary+'\n');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
