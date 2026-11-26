import {cryocareModelDefault} from './cryocare-training.mjs';
import {gainCandidates} from './gain-warning.mjs';
import {motionGainReference} from './motion-gain.mjs';
import {topazModelInputs} from './topaz-models.mjs';
import {polishingMicrographs} from './polishing-inputs.mjs';
import {previousParticleDiameter} from './particle-diameter-default.mjs';
import {unusedPickingInputs} from '../public/auto-picking-controls.js';
import {importFolderDefault} from './import-folder-default.mjs';
import {importMtfDefault} from './import-mtf-default.mjs';
import {importAngpixDefault,motionDoseDefault} from './import-angpix-default.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {compatibleInputs,nodeGroup,matchesInputFile,validInputProducer,modelAngeloMap} from './inputs.mjs';
import {localPath,SCREENING} from './screening.mjs';
import {parseStar} from './gallery.mjs';
import {readablePath,jobPath} from './paths.mjs';
import {importImageInfo} from './import-image-info.mjs';
const number=j=>Number(j.name.match(/job(\d+)/)?.[1]||0);
export async function sequentialDefaults(project,roots,state,layout,catalog,type,{convertGains=true}={}){
 const target=layout.find(l=>l.id===type);if(!target)return {};
 if(target.name==='Import tilt series'){
  const detected=await importFolderDefault(project,roots,['frames','Frames','Movies','Micrographs']);
  const mtf=await importMtfDefault(project,roots);
  const angpix=await importAngpixDefault(project,roots,state,type);
  return {...(detected?{movie_files:detected}:{}),...(mtf?{mtf_file:mtf}:{}),...(angpix?{angpix}:{})};
 }
 if(target.name==='Import'){
  const mtf=await importMtfDefault(project,roots),angpix=await importAngpixDefault(project,roots,state,type),mtfDefault={...(mtf?{fn_mtf:mtf}:{}),...(angpix?{angpix}:{})};
  const detected=await importFolderDefault(project,roots);if(detected)return {...mtfDefault,fn_in_raw:detected};
  const previous=state.jobs.filter(j=>j.type===SCREENING&&j.status==='Succeeded').sort((a,b)=>number(b)-number(a))[0];if(!previous)return mtfDefault;
  let copied;try{copied=JSON.parse(await fs.readFile(await localPath(project,previous.name+'screening-copy.json'),'utf8'));}catch{return mtfDefault;}
  if(!['Movies','Micrographs'].includes(copied.folder))return mtfDefault;
  const extensions=copied.extensionCasePreserved?copied.extensions:[...new Set((await fs.readdir(await localPath(project,copied.folder))).map(n=>path.extname(n)))];
  const globs=[...new Set(extensions||[])].filter(e=>['.tif','.tiff','.mrc'].includes(e.toLowerCase())).map(e=>e.slice(1));
  return globs.length?{...mtfDefault,fn_in_raw:copied.folder+'/*.'+(globs.length===1?globs[0]:'{'+globs.join(',')+'}'),is_multiframe:copied.frames>1?'Yes':'No'}:mtfDefault;
 }
 const producers=new Map();
 const result={},fields=catalog.find(s=>s.id===type)?.options||[],defaults={...Object.fromEntries((catalog.find(s=>s.id===type)?.options||[]).map(f=>[f.key,f.default])),...target.overrides};
 if(target.name==='Motion correction'&&fields.some(f=>f.key==='dose_per_frame')){const dose=await motionDoseDefault(project,roots,state,type);if(dose)result.dose_per_frame=dose;}
 if(target.name==='Motion correction'){const candidates=await gainCandidates(project,roots,{state,mode:target.mode});if(candidates.length===1){const gain=await motionGainReference(project,roots,candidates[0],{convert:convertGains});if(gain)result.fn_gain_ref=gain;}const imports=state.jobs.filter(j=>layout.find(l=>l.id===j.type)?.name===(target.mode==='tomo'?'Import tilt series':'Import')).sort((a,b)=>number(b)-number(a));const source=imports[0];if(source)try{const blocks=parseStar(await fs.readFile(await readablePath(project,roots,jobPath(project,source.name)+'job.star'),'utf8')),values=Object.fromEntries(blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue])),info=await importImageInfo(project,roots,target.mode==='tomo'?values.movie_files:values.fn_in_raw);if(info){result.patch_x=String(Math.max(1,Math.round(info.width/1000)));result.patch_y=String(Math.max(1,Math.round(info.height/1000)));}}catch{}}
 if(target.name==='Auto-picking'){const models=await topazModelInputs(project,roots,state);if(models.entries.length)result.topaz_model=models.entries[0].path;}
 if(target.name==='Denoise tomograms'){const model=await cryocareModelDefault(project,roots,state,layout);if(model)result.care_denoising_model=model;}
 if(target.name==='Bayesian polishing')result.fn_mic='';
 if(target.name==='CTF estimation')result.input_star_mics='';
 if(target.name==='ModelAngelo building')result.fn_map='';
 if(target.name==='Exclude tilt-images')result.in_tiltseries='';
 if(fields.some(f=>f.key==='particle_diameter')){const previous=await previousParticleDiameter(project,roots,state,layout);if(previous)result.particle_diameter=previous.diameter;}
 for(let field of fields.filter(f=>f.type===3&&!unusedPickingInputs(target,defaults).includes(f.key)&&!['fn_cont','fn_checkpoint','care_denoising_model'].includes(f.key)&&((target.name==='Bayesian polishing'&&f.key==='opt_params')||!target.fields?.[f.key]?.when?.some(rule=>defaults[rule.key]!==rule.value)))){
 if(target.name==='Exclude tilt-images'&&field.key==='in_tiltseries')field={...field,tiltSeriesOnly:true};
 const requireMicrographMetadata=target.name==='Bayesian polishing'&&field.key==='fn_mic';
 const modelAngeloMapOnly=target.name==='ModelAngelo building'&&field.key==='fn_map';
 const found=await compatibleInputs(project,roots,{...field,requireMicrographMetadata,modelAngeloMapOnly},state);if(found.truncated)continue;
 const matches=found.entries.filter(e=>(e.available&&e.status==='Succeeded')||['Running','Scheduled'].includes(e.status));
 // Use declared outputs even if .Nodes markers are missing after completion.
 const group=nodeGroup(field);
 for(const job of state.jobs.filter(j=>['Succeeded','Running','Scheduled'].includes(j.status))){
  if(!validInputProducer(field,job))continue;
  for(const file of job.outputs){
   if(modelAngeloMapOnly&&!modelAngeloMap(project,state,file))continue;
   if(requireMicrographMetadata&&!await polishingMicrographs(project,roots,file))continue;
   const node=state.nodes.find(n=>n.name===file);
   if(node&&node.type.split('.').slice(0,field.nodeDepth).join('.')===group&&matchesInputFile(path.posix.basename(file),field)&&!matches.some(e=>e.path===file))
    matches.push({path:file,status:job.status,available:false});
  }
 }
 const latest=state.jobs.filter(j=>['Succeeded','Running','Scheduled'].includes(j.status)&&matches.some(e=>j.outputs.includes(e.path))).sort((a,b)=>number(b)-number(a))[0];if(!latest)continue;
 const candidates=matches.filter(e=>latest.outputs.includes(e.path));if(candidates.length===1){result[field.key]=candidates[0].path;producers.set(field.key,latest);}
 }
 if(target.name==='Subset selection'){
  // Prefer the optimiser when one job publishes both an optimiser and particles.
  const alternatives=['fn_model','fn_mic','fn_data'];
  const chosen=alternatives.filter(k=>producers.has(k)).sort((a,b)=>number(producers.get(b))-number(producers.get(a)))[0];
  if(chosen)for(const key of alternatives)if(key!==chosen)result[key]='';
 }
 return result;
}
