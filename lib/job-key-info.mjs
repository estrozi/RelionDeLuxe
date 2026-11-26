import {tiltStatisticsReader} from './tilt-statistics.mjs';
import {resolutionNyquistEnricher} from './resolution-nyquist.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {jobPath,readablePath} from './paths.mjs';
import {importImageInfo} from './import-image-info.mjs';
export function subsetMethod(v){if(v.do_dominant_3d==='Yes'||v.param1_label==='reliondeluxe_dominant_3d')return 'dominant';return [['do_class_ranker','auto'],['do_select_values','metad'],['do_discard','stats'],['do_split','split'],['do_remove_duplicates','dupli'],['do_filaments','filam']].filter(([key])=>v[key]==='Yes').map(([,label])=>label).join(' · ')||'manual';}
export function keyInfo(type,v,log='') {
 if(type==='Align tilt-series')return v.do_aretomo2==='Yes'?'AreTomo':v.do_imod_fiducials==='Yes'?'IMOD fidu':v.do_imod_patchtrack==='Yes'?'IMOD patch':'';
 if(type==='Import')return '';
 if(type==='3D initial reference')return v.sym_name||'';
 if(type==='Extract subtomos')return Number(v.box_size_angst)>0&&Number(v.binned_size_pix)>0?`${v.binned_size_pix}px · ${(Number(v.box_size_angst)/Number(v.binned_size_pix)).toFixed(2)} Å/px`:v.binning?`bin: ${v.binning}`:'';
 if(type==='Motion correction')return v.bin_factor?`bin: ${v.bin_factor}`:'';
 if(['2D classification','3D classification'].includes(type))return v.nr_classes?`${v.nr_classes} classes`:'';
 if(type==='Bayesian polishing')return v.do_param_optim==='Yes'?'Train':v.do_polish==='Yes'?'Polish':'';
 if(type==='Auto-picking'){
  const mode=v.do_log==='Yes'?'LoG':v.do_refs==='Yes'?'References':v.do_topaz==='Yes'?(v.do_topaz_train==='Yes'?'TopazTrain':v.do_topaz_pick==='Yes'?'TopazPick':''):'';
  if(['TopazPick','LoG'].includes(mode)){const matches=[...log.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').matchAll(/Total number of (?:particles from\s+\d+\s+micrographs is|picked particles\s*:)\s*(\d+)/gi)];if(matches.length)return matches.at(-1)[1]+' particles '+mode;}
  return mode;
 }
 if(type==='CTF refinement'&&v.do_aniso_mag==='Yes'){
  const groups=new Map();for(const m of log.matchAll(/Magnification anisotropy of optics group #(\d+) named [^\r\n]*?:\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*%/gi)){const n=Number(m[2]);if(Number.isFinite(n))groups.set(m[1],n.toFixed(3)+'%');}
  return groups.size===1?[...groups.values()][0]:[...groups].map(([id,value])=>'#'+id+': '+value).join(' · ');
 }
 const lines=log.replace(/\x1b\[[0-9;]*[A-Za-z]/g,'').split(/[\r\n]+/).reverse();
 for(const line of lines){let m;
  if(type==='Reconstruct tomograms'){const count=line.match(/\bReconstructing\s+(\d+)\s+tomograms?\s*:/i);if(count)return `${count[1]} ${Number(count[1])===1?'tomogram':'tomograms'}`;}
  if(type==='Import tilt series'){const count=line.match(/Wrote STAR files for\s+(\d+)\s+tilt-series/i);if(count)return `${count[1]} tilt-series`;}
  if(type==='Particle extraction'){const count=line.match(/Written out STAR file with\s+(\d+)\s+particles\s+in\s+/i);if(count){const scaled=String(v.do_rescale).toLowerCase()==='yes',size=scaled?v.rescale:v.extract_size;return `${count[1]} particles`+(size?` ${size}px${scaled?'(scaled)':''}`:'');}}
  if(type==='Manual picking')m=line.match(/Total number of picked particles\s*:\s*(\d+)/i);
  if(type==='Subset selection'&&v.do_remove_duplicates==='Yes'){const removed=line.match(/Removed\s+(\d+)\s+duplicated objects from\s+(\d+)\s+objects/i);if(removed){const count=Number(removed[2])-Number(removed[1]);if(Number.isSafeInteger(count)&&count>=0)return `${count} particles`;}}
  if(type==='Subset selection')m=line.match(/(?:with\s+)?(\d+)\s+selected particles/i)||line.match(/Selected\s+(\d+)\s+particles/i)||(v.fn_mic?null:line.match(/Browser selection saved .*?and\s+(\d+)\s+output rows/i));
  if(m)return `${m[1]} particles`;
  if(['3D auto-refine','Post-processing','Postprocessing'].includes(type)){m=line.match(/Final resolution(?:\s*\([^)]*\))?\s*(?:is\s*)?[:=]\s*([0-9]+(?:\.[0-9]+)?(?:e[+-]?\d+)?)/i);if(m)return `${m[1]} Å`;}
 }
 return '';
}
export function resolutionValue(type,log=''){
 if(type==='3D auto-refine'){const n=parseFloat(keyInfo(type,{},log));return Number.isFinite(n)&&n>0&&n!==999?n:null;}
 if(!['3D initial reference','3D classification'].includes(type))return null;
 let value;
 for(const m of log.matchAll(/CurrentResolution\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s+Angstroms/gi)){
  const n=Number(m[1]);if(Number.isFinite(n)&&n>0&&n!==999)value=n;
 }
 return value??null;
}
export function resolutionInfo(type,log=''){
 if(type==='3D auto-refine')return keyInfo(type,{},log);
 const value=resolutionValue(type,log);
 return value===null?'':Number(value.toFixed(2))+' Å';
}
export function jobInfoEnricher(project,layout,readRoots=[]){
 const tiltStats=tiltStatisticsReader(project,readRoots);
 const cache=new Map(),counts=new Map(),enrichNyquist=resolutionNyquistEnricher(project,layout);
 return async state=>{for(const job of state.jobs){if(!['Succeeded','Failed','Aborted'].includes(job.status))continue;const type=layout.find(l=>l.id===job.type)?.name;if(!['Exclude tilt-images','Align tilt-series','Reconstruct tomograms','Mask creation','Import','Import tilt series','Motion correction','CTF estimation','Particle extraction','Extract subtomos','Manual picking','3D initial reference','2D classification','3D classification','Auto-picking','Bayesian polishing','CTF refinement','Subset selection','3D auto-refine','Post-processing','Postprocessing'].includes(type))continue;
  try {const dir=jobPath(project,job.name),settings=await readablePath(project,[],path.join(dir,'job.star'));const log=await readablePath(project,[],path.join(dir,'run.out')).catch(()=>null);const stats=await Promise.all([fs.stat(settings),log?fs.stat(log):null]);const stamp=stats.map(s=>s?`${s.mtimeMs}:${s.ctimeMs}:${s.size}`:'').join('|');let entry=cache.get(job.name);if(entry?.stamp!==stamp){const blocks=parseStar(await fs.readFile(settings,'utf8'));const values=Object.fromEntries(blocks.flatMap(b=>b.tables).flatMap(t=>t.rows).filter(r=>r.rlnJobOptionVariable).map(r=>[r.rlnJobOptionVariable,r.rlnJobOptionValue]));const text=log?await fs.readFile(log,'utf8'):'';const resolution=resolutionInfo(type,text),pattern=type==='Import'?values.fn_in_raw:type==='Import tilt series'?values.movie_files:'';let dimensions='';try{const info=pattern&&await importImageInfo(project,readRoots,pattern);if(info)dimensions=info.width+'×'+info.height;}catch{}entry={stamp,tiltInput:values.in_tiltseries,particleInput:values.fn_img||(values.use_direct_entries==='Yes'?values.in_particles:values.in_optimisation||values.in_particles),inputMap:values.fn_in,usedMask:values.fn_mask,sourceReference:values.param1_label==='reliondeluxe_dominant_3d'?values.in_part:values.fn_model,resolution,resolutionAngstrom:resolutionValue(type,text),detail:dimensions||(type==='Subset selection'?subsetMethod(values):['3D initial reference','3D classification'].includes(type)?resolution:''),importMovies:type==='Import'&&values.do_raw==='Yes'?values.is_multiframe:null,info:keyInfo(type,values,text)};cache.set(job.name,entry);}job.keyInfo=entry.info;if(entry.particleInput)job.resolutionParticleInput=entry.particleInput;if(type==='3D auto-refine')job.refinementMask=entry.usedMask;if(entry.detail)job.keyInfoDetail=entry.detail;if(entry.resolution){job.resolutionInfo=entry.resolution;job.resolutionAngstrom=entry.resolutionAngstrom;}if(type==='Import')job.importMovies=entry.importMovies;
// The External runner forwards relion_star_handler stdout, whose wording differs
// from native/manual selection. Count the actual output table for existing jobs.
if(type==='Subset selection'&&entry.detail==='dominant'){
 try{
  const output=await readablePath(project,[],path.join(dir,'particles.star'));
  const stat=await fs.stat(output),signature=stat.size+':'+stat.mtimeMs+':'+stat.ctimeMs;
  let count=counts.get(output);
  if(count?.signature!==signature){
   const tables=parseStar(await fs.readFile(output,'utf8')).flatMap(b=>b.tables).filter(t=>t.labels.includes('rlnImageName'));
   count={signature,total:tables.length?tables.reduce((n,t)=>n+t.rows.length,0):null};counts.set(output,count);
  }
  if(count.total!==null)job.keyInfo=count.total+' particles';
 }catch{/* Cleaned or missing output: retain any count available in stdout. */}
}
if(type==='CTF estimation'){
 try{
  const output=(job.outputs||[]).find(f=>/(?:micrographs_ctf|tilt_series_ctf|tilt_series)\.star$/i.test(f))||path.join(dir,'micrographs_ctf.star');
  const range=await tiltStats(output),format=n=>Number((n/10000).toFixed(1)).toString();
  if(Number.isFinite(range.min))job.keyInfo=format(range.min)+'μm-'+format(range.max)+'μm';
 }catch{/* Cleaned/missing metadata: do not invent a range. */}
}
if(type==='Exclude tilt-images'&&entry.tiltInput){
 try{
  const output=(job.outputs||[]).find(f=>/selected_tilt_series\.star$/i.test(f))||path.join(dir,'selected_tilt_series.star');
  const [input,selected]=await Promise.all([tiltStats(entry.tiltInput),tiltStats(output)]);
  if(input.count>=selected.count)job.keyInfo=`${input.count-selected.count}/${input.count} excluded`;
 }catch{/* Missing metadata: leave summary empty. */}
}

if(type==='Import'&&entry.importMovies!==null){
 try{
  const output=await readablePath(project,[],path.join(dir,entry.importMovies==='Yes'?'movies.star':'micrographs.star'));
  const stat=await fs.stat(output),signature=stat.size+':'+stat.mtimeMs+':'+stat.ctimeMs;
  let count=counts.get(output);
  if(count?.signature!==signature){
   const label=entry.importMovies==='Yes'?'rlnMicrographMovieName':'rlnMicrographName';
   const tables=parseStar(await fs.readFile(output,'utf8')).flatMap(b=>b.tables).filter(t=>t.labels.includes(label));
   count={signature,total:tables.length?tables.reduce((n,t)=>n+t.rows.length,0):null};counts.set(output,count);
  }
  if(count.total!==null)job.keyInfo=count.total+' files';
 }catch{/* No output count is available yet. */}
}
}catch{job.keyInfo='';}
 }
 // Resolve inheritance after all source summaries are available (pipeline order
 // is not guaranteed). The dominant map is a copy of the selected class map.
 for(const job of state.jobs){
  const entry=cache.get(job.name);
  if(!['Succeeded','Failed','Aborted'].includes(job.status)||entry?.detail!=='dominant')continue;
  delete job.resolutionInfo;delete job.resolutionAngstrom;delete job.resolutionSourceJob;
  job.keyInfoDetail='dominant';
  let file=entry.sourceReference;if(typeof file!=='string'||!file)continue;
  file=(path.isAbsolute(file)?path.relative(project,file):file).replace(/^\.\//,'');
  const source=state.jobs.find(j=>(j.outputs||[]).includes(file))||[...state.jobs].sort((a,b)=>b.name.length-a.name.length).find(j=>[j.name,j.alias&&j.alias!=='None'?j.alias:null].filter(Boolean).some(prefix=>file.startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
  if(!source||layout.find(l=>l.id===source.type)?.name!=='3D classification'||!source.resolutionInfo)continue;
  job.resolutionInfo=source.resolutionInfo;job.resolutionAngstrom=source.resolutionAngstrom;job.resolutionSourceJob=source.name;
  job.keyInfoDetail='dominant · '+source.resolutionInfo;
 }
 for(const job of state.jobs){
  delete job.maskRefinement;
  if(job.status!=='Succeeded'||layout.find(l=>l.id===job.type)?.name!=='Mask creation')continue;
  const input=cache.get(job.name)?.inputMap;if(!input)continue;
  const canonical=file=>{let value=(path.isAbsolute(file)?path.relative(project,file):file).replace(/^\.\//,'');const alias=state.jobs.filter(j=>j.alias&&j.alias!=='None').sort((a,b)=>b.alias.length-a.alias.length).find(j=>value.startsWith(j.alias.endsWith('/')?j.alias:j.alias+'/'));return alias?alias.name+value.slice(alias.alias.replace(/\/$/,'').length+1):value;};
  const file=canonical(input),source=state.jobs.find(j=>j.name!==job.name&&((j.outputs||[]).some(f=>canonical(f)===file)||file.startsWith(j.name)));
  const settings=source&&cache.get(source.name),mask=(job.outputs||[]).find(f=>/\/mask\.mrc$/i.test(f));
  if(mask&&source?.status==='Succeeded'&&layout.find(l=>l.id===source.type)?.name==='3D auto-refine'&&settings&&typeof settings.usedMask==='string'&&!settings.usedMask.trim())job.maskRefinement={job:source.name,mask};
 }
 return enrichNyquist(state);};
}
