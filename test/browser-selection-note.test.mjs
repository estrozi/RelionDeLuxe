import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {browserSelectionNote} from '../lib/browser-selection-note.mjs';
test('browser selection records native command with actual output job and preserves previous notes',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'select-note-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const name='Select/job045/';await fs.mkdir(path.join(root,name),{recursive:true});
 const note=path.join(root,name,'note.txt');await fs.writeFile(note,'Existing notes\n');
 const preview={jobName:'Select/job044/',commands:['`which relion_display` --gui --i Class2D/job021/run_it025_optimiser.star --allow_save --fn_parts Select/job044/particles.star --pipeline_control Select/job044/']};
 await browserSelectionNote(root,name,preview);let text=await fs.readFile(note,'utf8');assert(text.startsWith('Existing notes\n'));assert.match(text,/--fn_parts Select\/job045\/particles.star/);assert.match(text,/Class2D\/job021\/run_it025_optimiser.star/);assert.match(text,/gallery.html/);assert.match(text,/was not executed/);
 await browserSelectionNote(root,name,preview);text=await fs.readFile(note,'utf8');assert.equal(text.match(/Executing browser selection/g).length,2);
 await fs.unlink(note);await fs.symlink(path.join(root,'other'),note);await assert.rejects(browserSelectionNote(root,name,preview));assert.equal(await fs.stat(path.join(root,'other')).catch(()=>null),null);
});
