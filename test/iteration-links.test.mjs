import test from 'node:test';import assert from 'node:assert/strict';import {iterationLogParts} from '../public/iteration-links.js';
test('finished refinement iteration links preserve text and pad map filenames',()=>{const job={name:'Refine3D/job019/',status:'Succeeded'},text='<script>unsafe</script>\n Auto-refine: Iteration= 1\nOther\nAuto-refine: Iteration= 012\n';const parts=iterationLogParts(text,job,'3D auto-refine','stdout');assert.equal(parts.map(p=>p.text).join(''),text);assert.deepEqual(parts.filter(p=>p.file).map(p=>p.file),['Refine3D/job019/run_it001_half1_class001.mrc','Refine3D/job019/run_it012_half1_class001.mrc']);for(const [j,t,k]of [[job,'2D classification','stdout'],[job,'3D auto-refine','stderr']])assert.deepEqual(iterationLogParts(text,j,t,k),[{text}]);});

test('2D EM and gradient iteration messages link to padded optimiser files',()=>{const job={name:'Class2D/job008/',status:'Succeeded'},text=' Expectation iteration 1 of 25\n Gradient optimisation iteration 025\n';const parts=iterationLogParts(text,job,'2D classification','stdout');assert.equal(parts.map(p=>p.text).join(''),text);assert.deepEqual(parts.filter(p=>p.file).map(p=>[p.file,p.viewer]),[['Class2D/job008/run_it001_optimiser.star','gallery'],['Class2D/job008/run_it025_optimiser.star','gallery']]);assert.equal(iterationLogParts(text,{...job,status:'Running'},'2D classification','stdout').filter(p=>p.file).length,2);});

test('only existing iteration files become links',()=>{const text=' Gradient optimisation iteration 9\n Gradient optimisation iteration 10\n',job={name:'Class2D/job008/',status:'Running'};const parts=iterationLogParts(text,job,'2D classification','stdout',['Class2D/job008/run_it010_optimiser.star']);assert.equal(parts.map(p=>p.text).join(''),text);assert.deepEqual(parts.filter(p=>p.file).map(p=>p.file),['Class2D/job008/run_it010_optimiser.star']);});

test('initial reference iterations link only existing class maps while running',()=>{
 const job={name:'InitialModel/job010/',status:'Running'};
 const text=' Gradient optimisation iteration 9\n Gradient optimisation iteration 10\n Stochastic gradient descent iteration 20\n';
 const files=['InitialModel/job010/run_it010_class001.mrc','InitialModel/job010/run_it020_class001.mrc'];
 const parts=iterationLogParts(text,job,'3D initial reference','stdout',files);
 assert.equal(parts.map(p=>p.text).join(''),text);
 assert.deepEqual(parts.filter(p=>p.file).map(p=>p.file),files);
 assert(parts.filter(p=>p.file).every(p=>p.viewer!=='gallery'));
 assert.deepEqual(iterationLogParts(text,job,'3D initial reference','stderr',files),[{text}]);
});
