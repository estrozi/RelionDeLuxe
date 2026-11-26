import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
export async function resolveExecutable(name, {cwd=process.cwd(),env=process.env}={}) {
  const candidates=name.includes('/')?[path.resolve(cwd,name)]:(env.PATH||'').split(path.delimiter).map(dir=>path.resolve(cwd,dir||'.',name));
  for(const file of candidates)try{await fs.access(file,constants.X_OK);if((await fs.stat(file)).isFile())return file;}catch{}
  return null;
}
// Inspect executable positions only, never interpret/evaluate the generated shell text.
// RELION's native command builders remain responsible for quoting and execution.
export function commandExecutables(commands) {
 const names=new Set();
 for(const command of commands){
  for(const m of command.matchAll(/`which\s+([A-Za-z0-9_.+-]+)`/g)){names.add('which');names.add(m[1]);}
  for(const part of command.split(/\s*(?:&&|;)\s*/)){
   const m=part.trim().match(/^(?:"([^"\n]+)"|'([^'\n]+)'|([^\s`"']+))/);
   const name=m&&(m[1]||m[2]||m[3]);
   if(name&&!['echo','cd','export',':','test','true','false'].includes(name)&&!name.includes('='))names.add(name);
  }
 }
 return [...names];
}
export async function checkCommands(preview,values,options={}) {
 const queued=values.do_queue==='Yes';
 // Compute executables can exist only on queue workers. Report those as deferred;
 // the local queue submission command must still resolve before submission.
 const names=commandExecutables(preview.commands||[]);
 const checks=await Promise.all(names.map(async name=>({name,path:await resolveExecutable(name,options),required:!queued})));
 const launch=queued?(values.qsub||'sbatch'):Number(values.nr_mpi||1)>1?(options.env||process.env).RELION_MPIRUN||'mpirun':null;
 if(launch){const first=commandExecutables([launch])[0];if(first&&!checks.some(x=>x.name===first&&x.required))checks.push({name:first,path:await resolveExecutable(first,options),required:true});}
 return {checks,missing:checks.filter(x=>x.required&&!x.path).map(x=>x.name)};
}
export const relionPrograms=['relion_helix_inimodel2d','relion_import','relion_refine','relion_refine_mpi','relion_run_motioncorr','relion_run_motioncorr_mpi','relion_run_ctffind','relion_autopick','relion_preprocess','relion_display','relion_pipeliner'];

// External engines are arguments to RELION wrappers, so commandExecutables
// cannot discover them by inspecting command positions alone.
export async function configuredExecutableWarnings(layout,values,options={}){
 const field=layout.name==='CTF estimation'?'fn_ctffind_exe':layout.name==='Motion correction'&&values.do_own_motioncor==='No'?'fn_motioncor2_exe':null;
 if(!field)return [];
 const name=values[field]||'',label=field==='fn_ctffind_exe'?'CTFFIND':'MotionCor2';
 if(name&&await resolveExecutable(name,options))return [];
 const message=name?`${label} executable cannot be found or is not an executable regular file: ${name}. Check its path and execute permissions.`:`${label} executable is not configured. Set its executable field before submitting.`;
 return [{severity:'warning',field,file:name,message:message+(values.do_queue==='Yes'?' This check uses the server environment; if the executable is available only on cluster workers, verify that worker path before proceeding.':'')}];
}


// Only the browser's Topaz denoiser opts into bypassing SBGrid's capsule.
// Other scientific programs continue to use their normal launch environment.
export async function resolvePickerTopaz({cwd=process.cwd(),env=process.env}={}){
 const override=env.RELIONDELUXE_TOPAZ?.trim();
 if(override){
  const file=await resolveExecutable(override,{cwd,env});
  if(!file)throw Error('RELIONDELUXE_TOPAZ is not an executable file: '+override);
  return file;
 }
 const wrapper=await resolveExecutable('relion_python_topaz',{cwd,env});
 if(!wrapper)throw Error('Topaz denoising requires relion_python_topaz in the server PATH, or RELIONDELUXE_TOPAZ set to its executable path.');
 if(!wrapper.split(path.sep).includes('sbgrid_bin'))return wrapper;
 try{
  const {stdout}=await promisify(execFile)(wrapper,['--sbwhich'],{cwd,env,timeout:5000,maxBuffer:65536});
  const candidates=stdout.split(/\r?\n/).map(x=>x.trim()).filter(x=>path.isAbsolute(x)&&path.basename(x)==='relion_python_topaz');
  if(candidates.length===1){
   const file=await resolveExecutable(candidates[0],{cwd,env});
   if(file&&!file.split(path.sep).includes('sbgrid_bin'))return file;
  }
 }catch{}
 // Some site wrappers do not support discovery; leave them usable, with an
 // explicit override suggested if denoising fails or produces no output.
 return wrapper;
}

// RELION_MPIRUN is consumed by RELION's native command builder, including schedules.
export function mpiEnvironment(env=process.env){
 const copy={...env},override=env.RELIONDELUXE_MPIRUN?.trim();
 if(override){if(!path.isAbsolute(override)||/[\r\n\0]/.test(override))throw Error('RELIONDELUXE_MPIRUN must be an absolute executable path.');copy.RELION_MPIRUN="'"+override.replaceAll("'","'\\''")+"'";}
 return copy;
}
export async function checkMpiLauncher(values,{cwd=process.cwd(),env=process.env}={}){
 if(values.do_queue==='Yes'||!(Number(values.nr_mpi)>1))return;
 const name=env.RELIONDELUXE_MPIRUN?.trim()||commandExecutables([env.RELION_MPIRUN||'mpirun'])[0];
 if(!name)return;
 const launcher=await resolveExecutable(name,{cwd,env});
 if(!launcher)throw Error('MPI launcher not found: '+name+'. Set RELIONDELUXE_MPIRUN to the absolute path of the MPI launcher compatible with your RELION installation.');
 if(!launcher.includes('/sbgrid_bin/'))return;
 try{await promisify(execFile)(launcher,['--version'],{cwd,env,timeout:5000,maxBuffer:65536});}
 catch(e){throw Error('SBGrid MPI launcher failed: '+launcher+'\n'+String(e.stderr||e.message).trim()+'\nSet RELIONDELUXE_MPIRUN to a working MPI launcher compatible with this RELION build, then restart RelionDeLuxe. SBGrid remains loaded for RELION.');}
}
