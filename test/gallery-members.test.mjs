import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {galleryManifest} from '../lib/gallery.mjs';
test('class members follow optimiser data, filter class and retain optics and orientation',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'members-'));
 try{
  await fs.writeFile(path.join(root,'run_optimiser.star'),'data_optimiser_general\n_rlnModelStarFile model.star\n_rlnExperimentalDataStarFile data.star\n');
  await fs.writeFile(path.join(root,'model.star'),'data_model_classes\nloop_\n_rlnReferenceImage\n_rlnClassDistribution\n1@classes.mrcs 0.25\n2@classes.mrcs 0.75\n');
  await fs.writeFile(path.join(root,'data.star'),'data_optics\nloop_\n_rlnOpticsGroup\n_rlnImagePixelSize\n1 1.25\ndata_particles\nloop_\n_rlnImageName\n_rlnClassNumber\n_rlnOpticsGroup\n_rlnAnglePsi\n1@particles.mrcs 2 1 30\n2@particles.mrcs 1 1 10\n3@particles.mrcs 2 1 20\n');
  const classes=await galleryManifest(root,[],'run_optimiser.star');assert.equal(classes.memberSource,'run_optimiser.star');assert.equal(classes.rows.length,2);
  const members=await galleryManifest(root,[],'run_optimiser.star',2);
  assert.deepEqual(members.rows.map(r=>r.rlnImageName),['1@particles.mrcs','3@particles.mrcs']);
  assert.equal(members.rows[0].pixelSize,1.25);assert.equal(members.rows[0].rlnAnglePsi,'30');assert.equal(members.memberSource,null);
  assert.equal((await galleryManifest(root,[],'run_optimiser.star',3)).rows.length,0);
  await assert.rejects(galleryManifest(root,[],'run_optimiser.star',0),/Invalid class/);
  assert.equal((await galleryManifest(root,[],'model.star')).memberSource,null);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
