import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {adaptRelionLayouts} from '../lib/relion-compatibility.mjs';
import {pickingMethodsFor,selectPickingMethod,pickingTabEnabled} from '../public/auto-picking-controls.js';
test('5.1 amyloid is a fourth exclusive picking method with native tabs and corrected help',async()=>{
 const placements=JSON.parse(await fs.readFile(new URL('../public/placements-5.1-spa.json',import.meta.url)));
 const [id,tabs]=Object.entries(placements).find(([,tabs])=>tabs.Amyloid);
 const keys=[...new Set(Object.values(tabs).flat().map(f=>f.key))];
 const schema={id:Number(id),options:keys.map(key=>({key,help:key==='do_log'?'options in the autopick tab are ignored':''}))};
 const l={id:Number(id),name:'Auto-picking',tabs:{References:['do_refs'],autopicking:['do_amyloid']},fields:{}};
 adaptRelionLayouts([l],[schema],placements);
 assert(l.tabs.Amyloid);assert(l.tabs['Refs 2']);assert(l.tabs['I/O'].includes('do_amyloid'));
 assert.match(schema.options.find(f=>f.key==='do_log').help,/Refs 2 tab/);
 const v={do_refs:'Yes',do_log:'No',do_topaz:'No',do_amyloid:'Yes'};
 selectPickingMethod(l,v,'do_amyloid');assert.equal(v.do_refs,'No');assert(pickingTabEnabled(l,v,'Amyloid'));
 v.do_topaz='Yes';selectPickingMethod(l,v,'do_topaz');assert.equal(v.do_amyloid,'No');assert(!pickingTabEnabled(l,v,'Amyloid'));
 assert.equal(pickingMethodsFor({name:'Auto-picking',tabs:{Helix:[]}}).includes('do_amyloid'),false);
});
