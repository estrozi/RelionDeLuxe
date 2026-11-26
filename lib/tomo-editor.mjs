import {openVoxelSampler} from './tomo-optimize.mjs';
import fs from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {galleryManifest} from './gallery.mjs';
import {readablePath} from './paths.mjs';
import {starValue} from './settings.mjs';
import {sampleSupports,constrainSupports} from '../public/tomo-supports.js';
export const editorRevision=text=>createHash('sha256').update(text).digest('hex');
export async function tomoEditorInput(project,roots,values){
 if(values.in_star_file?.trim())throw Error('Editing imported particle STAR files is not supported yet. Open that file read-only, or create a Pick job with an empty input-particles field.');
 const manifest=await galleryManifest(project,roots,values.in_tomoset);
 if(!manifest.rows.every(r=>r.rlnTomoName))throw Error('Tomograms require rlnTomoName.');
 if(new Set(manifest.rows.map(r=>r.rlnTomoName)).size!==manifest.rows.length)throw Error('Duplicate tomogram names.');
 const volumeGeometry={};
 for(const row of manifest.rows){
  const column=['rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2'].find(k=>row[k]&&!['?','.','None','N/A'].includes(row[k]));
  if(!column)throw Error('No volume available to check particle bounds for '+row.rlnTomoName);
  const sampler=await openVoxelSampler(project,roots,row[column]);
  try{volumeGeometry[row.rlnTomoName]={dimensions:sampler.dimensions,spacing:sampler.spacing};}finally{await sampler.close();}
 }
 const actual=await readablePath(project,roots,values.in_tomoset);
 return {manifest,volumeGeometry,inputRevision:editorRevision(await fs.readFile(actual)),defaultType:values.pick_mode||'particles',spacing:Number(values.particle_spacing)||60};
}
export async function readTomoEditor(jobFile,context){
 const file=await jobFile('browser-tomo-supports.json'),text=file?await fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;}):'';
 const saved=text?JSON.parse(text):{version:1,inputRevision:context.inputRevision,supports:[]};
 if(saved.inputRevision!==context.inputRevision)throw Error('Tomogram input changed since the annotations were saved. Restore the original input before editing.');
 return {...context,supports:constrainSupports(saved.supports,context.volumeGeometry),revision:editorRevision(text)};
}
export function tomoParticleStar(samples){
 const oriented=samples.some(p=>p.euler),mixed=samples.some(p=>!p.euler)&&oriented;
 const labels=['rlnTomoName','rlnCenteredCoordinateXAngst','rlnCenteredCoordinateYAngst','rlnCenteredCoordinateZAngst','rlnSupportStructureType','rlnSupportStructureElement'];
 if(oriented)labels.push('rlnTomoSubtomogramRot','rlnTomoSubtomogramTilt','rlnTomoSubtomogramPsi','rlnAngleRot','rlnAngleTilt','rlnAnglePsi');
 // Mixed un-oriented particles must not acquire directional priors.
 if(oriented&&!mixed)labels.push('rlnAngleTiltPrior','rlnAnglePsiPrior');
 if(samples.some(p=>p.type==='filaments'))labels.push('rlnHelicalTubeID','rlnHelicalTrackLengthAngst');
 const rows=samples.map(p=>{
  const row=[p.tomogram,...p.position,p.type,p.element];
  if(oriented)row.push(...(p.euler||[0,0,0]),0,p.euler?90:0,0);
  if(oriented&&!mixed)row.push(90,0);
  if(labels.includes('rlnHelicalTubeID'))row.push(p.type==='filaments'?p.element:0,p.track??0);
  return row.map(starValue).join(' ');
 });
 return 'data_particles\n\nloop_\n'+labels.map((k,i)=>'_'+k+' #'+(i+1)).join('\n')+'\n'+rows.join('\n')+'\n';
}
export async function inVolumeSamples(project,roots,manifest,samples){
 const samplers=new Map();
 try{
  for(const name of new Set(samples.map(p=>p.tomogram))){
   const row=manifest.rows.find(r=>r.rlnTomoName===name);
   const column=['rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2'].find(k=>row?.[k]&&!['?','.','None','N/A'].includes(row[k]));
   if(!column)throw Error('No volume available to check particle bounds for '+name);
   samplers.set(name,await openVoxelSampler(project,roots,row[column]));
  }
  return samples.filter(p=>samplers.get(p.tomogram).contains(p.position));
 }finally{await Promise.all([...samplers.values()].map(s=>s.close()));}
}
export async function saveTomoEditor(jobFile,context,body,{finish=false,job='',filterSamples=async samples=>samples}={}){
 const current=await readTomoEditor(jobFile,context);
 if(body.revision!==current.revision)throw Error('Annotations changed in another window. Reload before saving.');
 if(!Array.isArray(body.supports)||body.supports.length>10000)throw Error('Invalid support list');
 const names=new Set(context.manifest.rows.map(r=>r.rlnTomoName));
 if(body.supports.some(s=>!names.has(s.tomogram)))throw Error('Support references an unknown tomogram');
 constrainSupports(body.supports,context.volumeGeometry);
 const text=JSON.stringify({version:1,inputRevision:context.inputRevision,supports:body.supports});
 if(Buffer.byteLength(text)>8*1024*1024)throw Error('Annotations exceed 8 MiB');
 const all=finish?sampleSupports(body.supports):null;
 const samples=finish?await filterSamples(all):null;
 const ignoredOutside=finish?all.length-samples.length:0;
 if(finish&&!samples.length)throw Error('No remaining particles inside the tomogram. Add or reposition supports before finishing.');
 const write=async(name,data)=>{
  const target=await jobFile(name),temp=await jobFile(name+'.'+randomUUID()+'.tmp');
  try{await fs.writeFile(temp,data,{flag:'wx'});await fs.rename(temp,target);}finally{await fs.rm(temp,{force:true});}
 };
 // Save geometry first; a failed export remains recoverable.
 await write('browser-tomo-supports.json',text);
 if(finish){
  await write('particles.star',tomoParticleStar(samples));
  await write('optimisation_set.star','data_optimisation_set\n\nloop_\n_rlnTomoParticlesFile\n_rlnTomoTomogramsFile\n'+starValue(job+'particles.star')+' '+starValue(context.manifest.file)+'\n');
 }
 return {revision:editorRevision(text),count:samples?.length,ignoredOutside};
}
