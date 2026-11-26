import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {localResolutionMethods,selectLocalResolutionMethod} from '../public/auto-picking-controls.js';
test('Local resolution default, merged tab and exclusive methods',async()=>{
 const layouts=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))),layout=layouts.find(l=>l.name==='Local resolution');
 assert.equal(layout.overrides.angpix,'-1');assert(!layout.tabs.ResMap&&!layout.tabs.Relion);
 const fields=layout.tabs['ResMap / RELION'];assert.equal(fields.length,11);assert.equal(new Set(fields).size,11);
 for(const key of localResolutionMethods){const values={do_resmap_locres:'Yes',do_relion_locres:'Yes',angpix:'1.5'};selectLocalResolutionMethod(layout,values,key);assert.equal(values[key],'Yes');assert.equal(values[localResolutionMethods.find(k=>k!==key)],'No');assert.equal(values.angpix,'1.5');}
});
