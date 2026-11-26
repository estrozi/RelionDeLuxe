import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {selectTopazMode,pickingTabEnabled,showTopazMode} from '../public/auto-picking-controls.js';
test('Topaz I/O controls and exclusive tabs follow the picking method',async()=>{
 const l=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))).find(l=>l.name==='Auto-picking');
 for(const k of ['do_topaz_train','do_topaz_pick']){assert(l.tabs['I/O'].includes(k));assert(!l.tabs.Topaz.includes(k));assert(!showTopazMode(l,{do_topaz:'No'},k));assert(showTopazMode(l,{do_topaz:'Yes'},k));}
 for(const [method,tab]of [['do_log','Laplacian'],['do_refs','References'],['do_topaz','Topaz']]){const v={[method]:'Yes'};for(const t of ['Laplacian','References','Topaz'])assert.equal(pickingTabEnabled(l,v,t),t===tab);for(const t of ['autopicking','Helix'])assert.equal(pickingTabEnabled(l,v,t),method==='do_refs');assert(pickingTabEnabled(l,v,'I/O'));assert(pickingTabEnabled(l,v,'Running'));}
 const v={do_topaz:'Yes',do_topaz_train:'No',do_topaz_pick:'No'};selectTopazMode(l,v,'do_topaz');assert.equal(v.do_topaz_pick,'Yes');v.do_topaz_train='Yes';selectTopazMode(l,v,'do_topaz_train');assert.equal(v.do_topaz_pick,'No');v.do_topaz_train='No';selectTopazMode(l,v,'do_topaz_train');assert.equal(v.do_topaz_pick,'Yes');
 assert(l.fields.topaz_nr_particles.when.some(c=>c.key==='do_topaz_train'));assert(l.fields.topaz_model.when.some(c=>c.key==='do_topaz_pick'));
});
