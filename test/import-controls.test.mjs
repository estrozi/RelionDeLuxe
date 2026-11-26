import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {selectImportMethod,showImportField} from '../public/auto-picking-controls.js';
test('Merged Import tab preserves fields and shows only enabled mode fields',async()=>{
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))).find(l=>l.name==='Import');
 assert.deepEqual(Object.keys(layout.tabs),['Movies/Mics/Others']);assert.equal(layout.tabs['Movies/Mics/Others'].length,15);
 const values={do_raw:'Yes',do_other:'No',fn_in_raw:'movies/*.mrc',fn_in_other:'ref.mrc'};
 assert(showImportField(layout,values,'fn_in_raw'));assert(!showImportField(layout,values,'fn_in_other'));
 values.do_other='Yes';selectImportMethod(layout,values,'do_other');assert.equal(values.do_raw,'No');
 assert(!showImportField(layout,values,'angpix'));assert(showImportField(layout,values,'node_type'));
 assert.equal(values.fn_in_raw,'movies/*.mrc');values.do_raw='Yes';selectImportMethod(layout,values,'do_raw');assert.equal(values.do_other,'No');
 values.do_raw='No';selectImportMethod(layout,values,'do_raw');assert.equal(values.do_other,'Yes');values.do_other='No';
 for(const key of ['do_raw','do_other'])assert(showImportField(layout,values,key));
 for(const key of layout.tabs['Movies/Mics/Others'].filter(k=>!['do_raw','do_other'].includes(k)))assert(!showImportField(layout,values,key));
 assert(showImportField({name:'Other'},values,'fn_in_raw'));
});
