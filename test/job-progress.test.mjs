import test from 'node:test';import assert from 'node:assert/strict';import {jobProgress,jobProgressEnricher} from '../lib/job-progress.mjs';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('motion/CTF use RELION progress dots, not time estimates',()=>{const bar='\r 10/999 sec '+'.'.repeat(30)+'~~(,_,">   [oo]';assert.equal(jobProgress('Motion correction','Correcting beam-induced motions using RELION\n'+bar).fraction,.5);assert.equal(jobProgress('CTF estimation','Estimating CTF parameters using CTFFIND\n'+bar+'\r 20/20 sec '+'.'.repeat(60)+'~~(,_,"> yum!\n').fraction,1);assert.equal(jobProgress('Motion correction',bar).fraction,null);assert.equal(jobProgress('Auto-picking',bar).fraction,null);});
test('classification follows iterations; auto-refine remains indeterminate',()=>{const log=' Expectation iteration 1 of 25\n Gradient optimisation iteration 10 of 25\n';assert.equal(jobProgress('2D classification',log).fraction,9/25);assert.equal(jobProgress('3D classification',log).fraction,9/25);assert.equal(jobProgress('3D auto-refine',log).fraction,null);assert.equal(jobProgress('2D classification','Waiting').fraction,null);});
test('progress refresh caches unchanged logs and removes completed job state',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'progress-'));try{await fs.mkdir(path.join(p,'Class2D/job001'),{recursive:true});const file=path.join(p,'Class2D/job001/run.out');await fs.writeFile(file,'Expectation iteration 2 of 10\n');const enrich=jobProgressEnricher(p,[{id:1,name:'2D classification'}]),state=()=>({jobs:[{name:'Class2D/job001/',type:1,status:'Running'}]});assert.equal((await enrich(state())).jobs[0].progress.fraction,.1);assert.equal((await enrich(state())).jobs[0].progress.fraction,.1);await fs.appendFile(file,'Expectation iteration 5 of 10\n');assert.equal((await enrich(state())).jobs[0].progress.fraction,.4);await fs.unlink(file);assert.equal((await enrich(state())).jobs[0].progress.fraction,null);}finally{await fs.rm(p,{recursive:true,force:true});}});
test('local resolution, polishing training and four ModelAngelo stages',()=>{assert.equal(jobProgress('Local resolution','Calculating local resolution in 300 sampling points\n\r 1/2 sec '+'.'.repeat(15)+'~~(,_,"> [oo]').fraction,.25);assert.equal(jobProgress('Bayesian polishing','it: \t s_vel: \t s_div: \t s_acc: \t fsc:\n\n 42: 0.1 100.0 1.0 -0.5\n').fraction,.42);assert.equal(jobProgress('Bayesian polishing','Polishing particles').fraction,null);const stages='0%|\r100%|\n100%|\n0%|\r100%|\n0%|\r50%|';assert.equal(jobProgress('ModelAngelo building',stages).fraction,.625);assert.equal(jobProgress('ModelAngelo building',stages+'\r100%|\n0%|\r100%|').fraction,1);assert.equal(jobProgress('ModelAngelo building','50%|\r10%|').fraction,null);});
test('DynaMight epoch and checkpoint progress follow latest phase',()=>{
 assert.equal(jobProgress('Dynamight flexibility','Epoch 45 of 50 epochs without consensus update').fraction,.9);
 assert.equal(jobProgress('DynaMight flexibility','40%|████      | 80/200 [05:59<08:54,  4.46s/it]Inversion loss for half 1 at iteration').fraction,.4);
 assert.equal(jobProgress('DynaMight flexibility','100%|████| 200/200\r10%|█| 20/200').fraction,.1);
 assert.equal(jobProgress('DynaMight flexibility','Epoch 1 of 0 epochs').fraction,null);
});
test('DynaMight reads tqdm stderr and refreshes progress',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'dynamight-progress-'));
 try{
  const dir=path.join(p,'DynaMight/job001');await fs.mkdir(dir,{recursive:true});
  const enrich=jobProgressEnricher(p,[{id:30,name:'DynaMight flexibility'}]),state=()=>({jobs:[{name:'DynaMight/job001/',type:30,status:'Running'}]});
  await fs.writeFile(path.join(dir,'run.err'),'40%|████| 80/200');
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.4);
  await fs.appendFile(path.join(dir,'run.err'),'\r50%|████| 100/200');
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.5);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
test('autopicking and extraction parse padded RELION progress bars',()=>{
 for(const [type,marker] of [['Auto-picking','Autopicking ...'],['Particle extraction','Extracting particles from the micrographs ...']]){
  const partial=marker+'\n   5/  18 sec '+'.'.repeat(15)+'~~(,_,">';
  assert.equal(jobProgress(type,partial).fraction,.25);
  assert.equal(jobProgress(type,partial+'\r  18/  18 sec '+'.'.repeat(60)+'~~(,_,">').fraction,1);
  assert.equal(jobProgress(type,partial+'\r   5/   5 sec '+'.'.repeat(60)+'~~(,_,"> yum!').fraction,1);
  assert.equal(jobProgress(type,marker).fraction,null);
 }
});

test('CTF refinement micrograph loop tracks dots, carriage returns and repeated phases',()=>{
 const header='+ Performing loop over all micrographs ...\n';
 const bar=n=>'1.52/1.52 min '+'.'.repeat(n)+'~~(,_,">';
 assert.equal(jobProgress('CTF refinement',header+bar(30)).fraction,0.5);
 assert.equal(jobProgress('CTF refinement',header+bar(30)+'\r'+bar(60)+' yum!').fraction,1);
 assert.equal(jobProgress('CTF refinement',header+bar(60)+' yum!\n'+header+bar(6)).fraction,0.1);
 assert.equal(jobProgress('CTF refinement',header).fraction,null);
});

test('polishing uses two equally weighted processing stages',()=>{
 const bar=n=>'1.10/1.10 min '+'.'.repeat(n)+'~~(,_,">';
 const first='+ Performing loop over micrographs ...\n';
 const second=' + Combining frames for micrographs ...\n';
 assert.equal(jobProgress('Bayesian polishing',first+bar(30)).fraction,0.25);
 assert.equal(jobProgress('Bayesian polishing',first+bar(60)+' yum!').fraction,0.5);
 assert.equal(jobProgress('Bayesian polishing',first+bar(60)+' yum!\n'+second+bar(30)).fraction,0.75);
 assert.equal(jobProgress('Bayesian polishing',second+bar(60)+' yum!').fraction,1);
});

test('STA reconstruction and per-tomogram extraction progress',()=>{
 const bar=n=>'0.98/4.92 min '+'.'.repeat(n)+'~~(,_,">';
 assert.equal(jobProgress('Reconstruct tomograms',' + Reconstructing ...\n'+bar(12)).fraction,.2);
 assert.equal(jobProgress('Reconstruct tomograms',' + Reconstructing ...\n'+bar(60)+' yum!').fraction,1);
 assert.equal(jobProgress('Reconstruct tomograms',bar(12)).fraction,null);
 const first='+ Tomogram 1 / 5:\n - Loading\n - Extracting particles:\n'+bar(60)+' yum!';
 assert.equal(jobProgress('Extract subtomos',first).fraction,.2);
 const second=first+'\n + Tomogram 2 / 5:\n - Loading\n';
 assert.equal(jobProgress('Extract subtomos',second).fraction,.2);
 const extracting=second+' - Extracting particles:\n';
 assert.equal(jobProgress('Extract subtomos',extracting+bar(30)).fraction,.3);
 assert.equal(jobProgress('Extract subtomos',extracting+bar(30)+'\r'+bar(54)).fraction,.38);
 assert.equal(jobProgress('Extract subtomos','+ Tomogram 5 / 5:\n - Extracting particles:\n'+bar(60)+' yum!').fraction,1);
 for(const text of ['loading','+ Tomogram 1 / 0:', '+ Tomogram 6 / 5:'])assert.equal(jobProgress('Extract subtomos',text).fraction,null);
});
test('extraction keeps latest tomogram context across large logs and refreshes',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'subtomo-progress-'));
 try{
  const dir=path.join(p,'Extract/job001');await fs.mkdir(dir,{recursive:true});
  const file=path.join(dir,'run.out'),bar=n=>'6.68/7.52 min '+'.'.repeat(n)+'~~(,_,">';
  await fs.writeFile(file,'x'.repeat(70000)+'\n + Tomogram 2 / 5:\n - Loading\n - Extracting particles:\n'+(bar(20)+'\r').repeat(6000)+bar(30));
  const enrich=jobProgressEnricher(p,[{id:99,name:'Extract subtomos'}]);
  const state=()=>({jobs:[{name:'Extract/job001/',type:99,status:'Running'}]});
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.3);
  await fs.appendFile(file,'\r'+bar(60)+' yum!\n + Tomogram 3 / 5:\n - Loading\n');
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.4);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});

test('STA particle reconstruction progresses through backprojection of all tomograms',()=>{
 const bar=n=>'13.68/13.68 min '+'.'.repeat(n)+'~~(,_,">';
 let text='';
 for(let i=1;i<=5;i++){
  text+='\n + Tomogram '+i+' / 5:\n - Loading\n';
  assert.equal(jobProgress('Reconstruct particle',text).fraction,(i-1)/5);
  text+=' - Backprojecting:\n'+bar(30);
  assert.equal(jobProgress('Reconstruct particle',text).fraction,(i-.5)/5);
  text+='\r'+bar(60)+' yum!\n';
  assert.equal(jobProgress('Reconstruct particle',text).fraction,i/5);
 }
 assert.match(jobProgress('Reconstruct particle',text).label,/finalizing/);
 assert.equal(jobProgress('Reconstruct particle','+ Tomogram 6 / 5:').fraction,null);
});
test('reconstruction retains tomogram context in large logs',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'reconstruct-progress-'));
 try{
  const dir=path.join(p,'Reconstruct/job001');await fs.mkdir(dir,{recursive:true});
  const file=path.join(dir,'run.out'),bar=n=>'6.68/7.52 min '+'.'.repeat(n)+'~~(,_,">';
  await fs.writeFile(file,' + Tomogram 3 / 5:\n - Backprojecting:\n'+(bar(20)+'\r').repeat(6000)+bar(30));
  const enrich=jobProgressEnricher(p,[{id:54,name:'Reconstruct particle'}]);
  const state=()=>({jobs:[{name:'Reconstruct/job001/',type:54,status:'Running'}]});
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.5);
  await fs.appendFile(file,'\r'+bar(60)+' yum!\n + Tomogram 4 / 5:\n - Loading\n');
  assert.equal((await enrich(state())).jobs[0].progress.fraction,.6);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
