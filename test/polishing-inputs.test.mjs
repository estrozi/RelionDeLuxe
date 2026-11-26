import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {polishingMicrographs} from '../lib/polishing-inputs.mjs';
test('polishing candidates require metadata in the micrograph table and recheck changed files',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'polish-input-'));
 try{
  const file='micrographs.star',full=path.join(root,file);
  assert.equal(await polishingMicrographs(root,[],file),false);
  await fs.writeFile(full,'data_micrographs\nloop_\n_rlnMicrographName #1\nmic.mrc\n');
  assert.equal(await polishingMicrographs(root,[],file),false);
  await fs.writeFile(full,'data_micrographs\nloop_\n_rlnMicrographName #1\n_rlnMicrographMetadata #2\nmic.mrc metadata.star\n');
  assert.equal(await polishingMicrographs(root,[],file),true);
  await fs.writeFile(full,'data_micrographs\nloop_\n_rlnMicrographName\nmic.mrc\n# _rlnMicrographMetadata\n');
  assert.equal(await polishingMicrographs(root,[],file),false);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
