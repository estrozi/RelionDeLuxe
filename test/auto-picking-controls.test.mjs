import test from 'node:test';
import assert from 'node:assert/strict';
import {pickingMethods,selectPickingMethod,showPickingField} from '../public/auto-picking-controls.js';
const layout={name:'Auto-picking'};
test('Choosing any picking method clears both alternatives, preserving unrelated settings',()=>{
 for(const key of pickingMethods){
  const values={do_refs:'Yes',do_log:'Yes',do_topaz:'Yes',fn_input_autopick:'micrographs.star'};
  selectPickingMethod(layout,values,key);
  for(const method of pickingMethods)assert.equal(values[method],method===key?'Yes':'No');
  assert.equal(values.fn_input_autopick,'micrographs.star');
 }
 const values={do_refs:'No',do_log:'Yes',do_topaz:'No'};
 selectPickingMethod(layout,values,'do_refs');assert.equal(values.do_log,'Yes');
 selectPickingMethod({name:'Other'},values,'do_log');assert.equal(values.do_refs,'No');
});
test('Manual continuation is shown only for continuation contexts',()=>{
 assert.equal(showPickingField(layout,'continue_manual',null),false);
 assert.equal(showPickingField(layout,'continue_manual',null,true),false);
 assert.equal(showPickingField(layout,'continue_manual',{status:'Scheduled'}),false);
 assert.equal(showPickingField(layout,'continue_manual',{status:'Scheduled'},true),true);
 for(const status of ['Succeeded','Failed','Aborted'])assert.equal(showPickingField(layout,'continue_manual',{status}),true);
 for(const key of pickingMethods)assert.equal(showPickingField(layout,key,null),true);
 assert.equal(showPickingField({name:'Other'},'continue_manual',null),true);
});
test('The last active picking method cannot be switched off',()=>{
 for(const key of pickingMethods){const values={do_refs:'No',do_log:'No',do_topaz:'No'};selectPickingMethod(layout,values,key);assert.equal(values[key],'Yes');assert.equal(pickingMethods.filter(k=>values[k]==='Yes').length,1);}
});
test('New auto-picking jobs default exclusively to LoG',async()=>{
 const fs=await import('node:fs/promises');const layouts=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url)));
 const defaults=layouts.find(l=>l.name==='Auto-picking').overrides;assert.equal(defaults.do_log,'Yes');assert.equal(defaults.do_refs,'No');assert.equal(defaults.do_topaz,'No');
});
