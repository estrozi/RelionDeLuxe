import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {resolveTomogramSource} from '../lib/tomogram-source.mjs';
import {attachTomogramParticles} from '../lib/tomogram-overlay.mjs';
test('subset follows optimiser and extraction provenance, retaining only subset coordinates across STAR blocks',async()=>{
 const project=await fs.mkdtemp(path.join(os.tmpdir(),'subset-tomo-'));
 try{
  const files={
   'Select/job004/particles.star':'data_optics\nloop_\n_rlnOpticsGroup\n1\ndata_particles\nloop_\n_rlnTomoName\n_rlnCenteredCoordinateXAngst\n_rlnCenteredCoordinateYAngst\n_rlnCenteredCoordinateZAngst\n_rlnImageName\nA 4 8 12 1@stack.mrcs\n',
   'Class3D/job003/run_optimiser.star':'data_optimiser_general\n_rlnExperimentalDataStarFile Extract/job002/particles.star\n',
   'Extract/job002/particles.star':'data_particles\nloop_\n_rlnTomoName\n_rlnCoordinateX\n_rlnCoordinateY\n_rlnCoordinateZ\nA 10 20 30\nA 40 50 60\n',
   'Extract/job002/optimisation_set.star':'data_\n_rlnTomoTomogramsFile Denoise/job001/tomograms.star\n',
   'Denoise/job001/tomograms.star':'data_global\nloop_\n_rlnTomoName\n_rlnTomoReconstructedTomogramDenoised\nA a.mrc\n'};
  for(const [f,text]of Object.entries(files)){await fs.mkdir(path.dirname(path.join(project,f)),{recursive:true});await fs.writeFile(path.join(project,f),text);}
  const jobs=[{name:'Select/job004/',inputs:[]},{name:'Class3D/job003/',inputs:[]},{name:'Extract/job002/',inputs:[]}];
  const values={'Select/job004/':{fn_model:'Class3D/job003/run_optimiser.star'},'Class3D/job003/':{fn_img:'Extract/job002/particles.star'},'Extract/job002/':{in_optimisation:'Extract/job002/optimisation_set.star'}};
  const adapter={call:async([op,name])=>op==='state'?{jobs}:{values:values[name]}};
  assert.equal(await resolveTomogramSource(project,[],'Select/job004/particles.star','Select/job004/',adapter),'Denoise/job001/tomograms.star');
  // The same extracted particles can be opened as extraction output or classification input.
  for(const job of ['Extract/job002/','Class3D/job003/'])
   assert.equal(await resolveTomogramSource(project,[],'Extract/job002/particles.star',job,adapter),'Denoise/job001/tomograms.star');
  const m=await attachTomogramParticles(project,[],{rows:[{rlnTomoName:'A'}]},'Select/job004/particles.star');
  assert.deepEqual(m.rows[0].tomoPicks,[[4,8,12]]);assert.equal(m.rows[0].tomoPickUnits,'angstrom');
  const legacy=await attachTomogramParticles(project,[],{rows:[{rlnTomoName:'A'}]},'Extract/job002/particles.star');
  assert.equal(legacy.rows[0].tomoPickUnits,'unbinned-pixel');assert.equal(legacy.rows[0].tomoPicks.length,2);
  values['Extract/job002/']={fn_data:'Select/job004/particles.star'};
  await assert.rejects(resolveTomogramSource(project,[],'Select/job004/particles.star','Select/job004/',adapter),/Cannot locate/);
 }finally{await fs.rm(project,{recursive:true,force:true});}
});
