import test from 'node:test';import assert from 'node:assert/strict';
import {increaseContinuationIterations} from '../public/continuation-controls.js';
test('2D continuation adds ten EM or fifty gradient iterations, once per changed file',()=>{
 for(const [mode,key,step]of [['do_em','nr_iter_em',10],['do_grad','nr_iter_grad',50]]){
  const values={[mode]:'Yes',[key]:'25',fn_cont:'Class2D/job001/run_it025_optimiser.star'};
  assert.equal(increaseContinuationIterations({name:'2D classification'},values,''),key);assert.equal(values[key],String(25+step));
  assert.equal(increaseContinuationIterations({name:'2D classification'},values,values.fn_cont),null);assert.equal(values[key],String(25+step));
  values.fn_cont='';assert.equal(increaseContinuationIterations({name:'2D classification'},values,'old'),null);
 }
});
test('does not modify other jobs, ambiguous modes or invalid iteration values',()=>{
 for(const values of [{do_em:'Yes',nr_iter_em:'oops'},{do_em:'Yes',do_grad:'Yes',nr_iter_em:'25'},{do_em:'Yes',nr_iter_em:'-1'}]){
  const v={...values,fn_cont:'file.star'};assert.equal(increaseContinuationIterations({name:'2D classification'},v,''),null);
 }
 const v={do_em:'Yes',nr_iter_em:'25',fn_cont:'file.star'};
 assert.equal(increaseContinuationIterations({name:'3D auto-refine'},v,''),null);assert.equal(v.nr_iter_em,'25');
});

test('3D continuation adds ten iterations only for a changed nonempty file',()=>{
 const layout={name:'3D classification'},values={nr_iter:'25',fn_cont:'Class3D/job002/run_it025_optimiser.star'};
 assert.equal(increaseContinuationIterations(layout,values,''),'nr_iter');assert.equal(values.nr_iter,'35');
 assert.equal(increaseContinuationIterations(layout,values,values.fn_cont),null);assert.equal(values.nr_iter,'35');
 values.fn_cont='';assert.equal(increaseContinuationIterations(layout,values,'old'),null);
 for(const nr_iter of ['', 'bad', '-1', '2.5'])assert.equal(increaseContinuationIterations(layout,{nr_iter,fn_cont:'new.star'},''),null);
});

test('initial reference continuation adds fifty mini-batches once per changed file',()=>{
 const layout={name:'3D initial reference'},values={nr_iter:'200',fn_cont:'InitialModel/job001/run_it200_optimiser.star'};
 assert.equal(increaseContinuationIterations(layout,values,''),'nr_iter');assert.equal(values.nr_iter,'250');
 assert.equal(increaseContinuationIterations(layout,values,values.fn_cont),null);assert.equal(values.nr_iter,'250');
 values.fn_cont='';assert.equal(increaseContinuationIterations(layout,values,'old'),null);
 for(const nr_iter of ['', 'bad', '-1', '2.5'])assert.equal(increaseContinuationIterations(layout,{nr_iter,fn_cont:'new.star'},''),null);
});
