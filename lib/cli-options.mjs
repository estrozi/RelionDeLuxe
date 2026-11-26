import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveExecutable} from './executables.mjs';
const run=promisify(execFile),cache=new Map();
export function helpProgram(name,tomo=false,variant=''){
 const base={'Import':'relion_import','Motion correction':'relion_run_motioncorr','CTF estimation':'relion_run_ctffind','Manual picking':'relion_manualpick','Auto-picking':'relion_autopick','Particle extraction':'relion_preprocess','2D classification':'relion_refine','3D initial reference':'relion_refine','3D classification':'relion_refine','3D auto-refine':'relion_refine','3D multi-body':'relion_refine','Subset selection':variant==='ranker'?'relion_class_ranker':variant==='display'?'relion_display':'relion_star_handler','CTF refinement':'relion_ctf_refine','Bayesian polishing':'relion_motion_refine','Mask creation':'relion_mask_create','Join star files':'relion_star_handler','Particle subtraction':'relion_particle_subtract','Post-processing':'relion_postprocess','Local resolution':variant==='resmap'?null:'relion_postprocess','3D initial helical reference':'relion_helix_inimodel2d'};
 const sta={'Align tilt-series':'relion_align_tiltseries','Reconstruct tomograms':'relion_tomo_reconstruct_tomogram','Extract subtomos':'relion_tomo_subtomo','Reconstruct particle':'relion_tomo_reconstruct_particle','CTF refinement':'relion_tomo_refine_ctf','Bayesian polishing':'relion_tomo_align'};
 return (tomo&&sta[name])||base[name]||null;
}
export function parseHelp(text){
 const options=new Map();
 for(const line of text.replace(/\x1b\[[0-9;]*m/g,'').split(/\r?\n/)){
  for(const match of line.matchAll(/(?:^|[\s,\[(|])(--[A-Za-z][A-Za-z0-9_-]*)\b/g)){
   const option=match[1];if(!options.has(option))options.set(option,{option,description:line.trim().slice(0,500)});
  }
 }
 return [...options.values()].sort((a,b)=>a.option.localeCompare(b.option));
}
export async function executableOptions(name,{cwd,env=process.env}={}){
 if(!name)return {options:[],message:'CLI suggestions are not available for this job mode. Additional arguments remain editable.'};
 const exe=await resolveExecutable(name,{cwd,env});if(!exe)return {options:[],message:name+' is not available in the server PATH.'};
 const key=exe,prior=cache.get(key);if(prior&&Date.now()-prior.time<300000)return prior.promise;
 const promise=(async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-help-'));
  try{
   let text='';
   try{const r=await run(exe,['--help'],{cwd:dir,env,timeout:8000,maxBuffer:1024*1024});text=r.stdout+'\n'+r.stderr;}
   catch(e){if(e.killed)return {options:[],executable:name,message:'Executable help timed out; additional arguments remain editable.'};text=(e.stdout||'')+'\n'+(e.stderr||'');}
   const options=parseHelp(text);
   return {options,executable:name,message:options.length?'':'No CLI options found in '+name+' --help. Check the executable environment.'};
  }finally{await fs.rm(dir,{recursive:true,force:true});}
 })();cache.set(key,{time:Date.now(),promise});promise.catch(()=>cache.delete(key));return promise;
}
