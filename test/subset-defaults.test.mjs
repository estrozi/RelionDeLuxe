import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {classSelectionDefaults} from '../public/subset-defaults.js';
test('class input clears only inherited non-class scientific boolean options',async()=>{
 const layout=JSON.parse(await fs.readFile(new URL('../public/layout.json',import.meta.url))).find(l=>l.name==='Subset selection');
 const schema=JSON.parse(await fs.readFile(new URL('../public/catalog.json',import.meta.url))).find(s=>s.id===layout.id);
 const values={fn_model:'Class2D/job006/run_it025_optimiser.star',do_split:'Yes',do_random:'Yes',do_discard:'Yes',do_select_values:'Yes',do_remove_duplicates:'Yes',do_filaments:'Yes',do_regroup:'Yes',do_recenter:'Yes',do_class_ranker:'Yes',do_queue:'Yes',split_size:'100'};
 classSelectionDefaults(layout,schema,values);
 for(const key of ['do_split','do_random','do_discard','do_select_values','do_remove_duplicates','do_filaments'])assert.equal(values[key],'No');
 for(const key of ['do_regroup','do_recenter','do_class_ranker','do_queue'])assert.equal(values[key],'Yes');
 assert.equal(values.split_size,'100');
 const particles={fn_model:'',fn_data:'particles.star',do_split:'Yes'};assert.deepEqual(classSelectionDefaults(layout,schema,{...particles}),particles);
});
