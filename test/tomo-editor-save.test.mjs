import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {editorRevision,readTomoEditor,saveTomoEditor} from '../lib/tomo-editor.mjs';
import {parseStar} from '../lib/gallery.mjs';
test('support saving detects stale edits, writes selected support metadata and protects changed inputs',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tomo-edit-'));
 try{
  const jobFile=async name=>path.join(root,name),context={inputRevision:'original',manifest:{file:'Denoise/job001/tomograms.star',rows:[{rlnTomoName:'T'}]}};
  const first=await readTomoEditor(jobFile,context);assert.equal(first.revision,editorRevision(''));
  const supports=[{id:1,type:'particles',tomogram:'T',points:[[1,2,3]]}];
  const saved=await saveTomoEditor(jobFile,context,{revision:first.revision,supports});
  await assert.rejects(fs.access(path.join(root,'particles.star')));
  await assert.rejects(saveTomoEditor(jobFile,context,{revision:first.revision,supports}),/another window/);
  const finished=await saveTomoEditor(jobFile,context,{revision:saved.revision,supports},{finish:true,job:'Picks/job002/'});
  assert.equal(finished.count,1);
  const table=parseStar(await fs.readFile(path.join(root,'particles.star'),'utf8')).flatMap(b=>b.tables)[0];
  assert.equal(table.rows[0].rlnSupportStructureElement,'1');assert.equal(table.rows[0].rlnCenteredCoordinateXAngst,'1');
  assert.match(await fs.readFile(path.join(root,'optimisation_set.star'),'utf8'),/Picks\/job002\/particles.star/);
  await assert.rejects(readTomoEditor(jobFile,{...context,inputRevision:'changed'}),/input changed/);
  await assert.rejects(saveTomoEditor(jobFile,context,{revision:finished.revision,supports:[{...supports[0],tomogram:'unknown'}]}),/unknown tomogram/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
