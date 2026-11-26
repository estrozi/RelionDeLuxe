import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {classConvergence,convergence,refinementLogParser} from '../lib/convergence.mjs';
const star=p=>`data_model_classes\nloop_\n_rlnEstimatedResolution\n_rlnReferenceImage\n_rlnClassDistribution\n8.5 run_class002.mrc ${p}\n\ndata_model_class_1\nloop_\n_x\n1\n`;
test('class convergence reads named columns and stable class IDs',()=>{assert.deepEqual(classConvergence(star('.8')),[{id:2,population:.8,resolution:8.5}]);assert.deepEqual(classConvergence(star('nan')),[{id:2,population:null,resolution:8.5}]);});
test('convergence updates cached iterations, tolerates partial files and accepts continuation filenames',async()=>{const p=await fs.mkdtemp(path.join(os.tmpdir(),'convergence-'));try{const d=path.join(p,'Class3D/job001');await fs.mkdir(d,{recursive:true});await fs.writeFile(path.join(d,'run_it000_model.star'),star('.2'));await fs.writeFile(path.join(d,'run_ct0_it001_model.star'),star('.4'));await fs.writeFile(path.join(d,'run_it002_model.star'),'data_model_classes\nloop_\n_rlnClassDistribution\n');let r=await convergence(p,[],'Class3D/job001/');assert.deepEqual(r.iterations.map(i=>i.iteration),[0,1]);assert.equal(r.warnings.length,1);await fs.writeFile(path.join(d,'run_it002_model.star'),star('.6000'));r=await convergence(p,[],'Class3D/job001/');assert.equal(r.iterations.length,3);assert.equal(r.warnings.length,0);}finally{await fs.rm(p,{recursive:true,force:true});}});
const accuracyStar='data_model_classes\nloop_\n_rlnReferenceImage\n_rlnAccuracyTranslationsAngst\n_rlnAccuracyRotations\n000002@classes.mrcs 1.5 999\n000003@classes.mrcs 0 4.5\n000004@classes.mrcs 999 0\n';
test('2D accuracy omits sentinel values independently and uses stack class IDs',()=>{
 assert.deepEqual(classConvergence(accuracyStar,'2d'),[{id:2,rotation:null,translation:1.5},{id:3,rotation:4.5,translation:null},{id:4,rotation:null,translation:null}]);
 assert.throws(()=>classConvergence(star('.8'),'2d'),/accuracy table/);
});
test('2D convergence reads accuracy files without population or resolution columns',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'convergence-2d-'));
 try{const d=path.join(p,'Class2D/job001');await fs.mkdir(d,{recursive:true});await fs.writeFile(path.join(d,'run_it010_model.star'),accuracyStar);
 const result=await convergence(p,[],'Class2D/job001/','2d');assert.equal(result.mode,'2d');assert.equal(result.warnings.length,0);assert.equal(result.iterations[0].classes[0].translation,1.5);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});
test('3D class invalid metrics do not discard other classes or metrics',()=>{
 const data='data_model_classes\nloop_\n_rlnReferenceImage\n_rlnClassDistribution\n_rlnEstimatedResolution\nrun_class001.mrc .3 inf\nrun_class002.mrc -nan 5\nrun_class003.mrc .7 4\n';
 assert.deepEqual(classConvergence(data),[{id:1,population:.3,resolution:null},{id:2,population:null,resolution:5},{id:3,population:.7,resolution:4}]);
});
test('auto-refine stdout associates all metrics with printed iterations',()=>{
 const parser=refinementLogParser();
 for(const line of ['Auto-refine: Iteration= 13','Auto-refine: Resolution= 3.50195 (no gain for 0 iter)','Auto-refine: Changes in angles= 0.873324 degrees; and in offsets= 0.137167 Angstroms (no gain for 0 iter)','Auto-refine: Iteration= 14','Auto-refine: Resolution= nan (no gain for 0 iter)','Auto-refine: Changes in angles= 0 degrees; and in offsets= 1.2e-3 Angstroms'])parser.line(line);
 assert.deepEqual(parser.result().iterations.map(x=>x.classes[0]),[{id:1,resolution:3.50195,rotation:.873324,translation:.137167},{id:1,resolution:null,rotation:0,translation:.0012}]);
});
test('auto-refine stdout refreshes after appended progress',async()=>{
 const p=await fs.mkdtemp(path.join(os.tmpdir(),'refine-convergence-'));
 try{await fs.mkdir(path.join(p,'Refine3D/job001'),{recursive:true});const file=path.join(p,'Refine3D/job001/run.out');
 await fs.writeFile(file,'Auto-refine: Iteration= 1\nAuto-refine: Resolution= 8\n');
 assert.equal((await convergence(p,[],'Refine3D/job001/','refine3d')).iterations.length,1);
 await fs.appendFile(file,'Auto-refine: Iteration= 2\nAuto-refine: Resolution= 7\n');
 assert.equal((await convergence(p,[],'Refine3D/job001/','refine3d')).iterations.length,2);
 }finally{await fs.rm(p,{recursive:true,force:true});}
});

test('RELION undefined 999 values are omitted from all convergence modes',()=>{
 assert.equal(classConvergence(star('.5').replace('8.5','999'))[0].resolution,null);
 assert.equal(classConvergence(star('999'))[0].population,null);
 const parser=refinementLogParser();
 parser.line('Auto-refine: Iteration= 1');
 parser.line('Auto-refine: Resolution= 999');
 parser.line('Auto-refine: Changes in angles= 999 degrees; and in offsets= 999 Angstroms');
 assert.deepEqual(parser.result().iterations[0].classes[0],{id:1,resolution:null,rotation:null,translation:null});
});

 test('plot selection snaps to nearest actual iteration, including gaps',async()=>{
 const {nearestIteration}=await import('../public/convergence.js');
 assert.equal(nearestIteration([{iteration:0},{iteration:10},{iteration:25}],14),10);
 assert.equal(nearestIteration([{iteration:0},{iteration:10},{iteration:25}],22),25);
 assert.equal(nearestIteration([{iteration:0}],0),0);
 assert.equal(nearestIteration([],5),null);
 });
test('class colors are stable by class number for plot and previews',async()=>{
 const {classColor}=await import('../public/convergence.js');
 assert.equal(classColor(1),'#d83dcc');assert.equal(classColor(2),'#168bd2');
 assert.equal(classColor(7),classColor(1));
});
