import {resolveExecutable} from './executables.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
export async function clusterSetup(env=process.env,directory='/usr/local/slurm',{log=console.log,warn=console.warn}={}){
 const errors=[];
 for(const key of ['RELIONDELUXE_MPIRUN','RELIONDELUXE_TOPAZ']){
  let file=env[key]?.trim();
  const explicit=!!file;
  if(!file){
   const names=key==='RELIONDELUXE_MPIRUN'
    ?(env.RELION_MPIRUN?[]:['mpirun.relion','mpirun','mpiexec'])
    :['relion_python_topaz'];
   for(const name of names){const candidate=await resolveExecutable(name,{env});if(candidate){file=candidate;break;}}
   if(!file){
    warn(key==='RELIONDELUXE_TOPAZ'
     ?'Cluster setup: optional Topaz wrapper not found. Startup continues; configure Topaz only if you use Topaz denoising.'
     :env.RELION_MPIRUN?'Cluster setup: preserving existing RELION_MPIRUN setting.'
     :'Cluster setup: MPI launcher not found in PATH. Startup continues. Load the RELION/MPI environment used by your cluster before running MPI jobs, or configure it in your queue script. For a custom launcher set RELIONDELUXE_MPIRUN to its absolute path.');
    continue;
   }
  }
  if(!file||!path.isAbsolute(file)){errors.push(key+' must point to an absolute, working executable path.');continue;}
  try{
   const real=await fs.realpath(file);
   if(!(key==='RELIONDELUXE_MPIRUN'&&path.basename(file)==='mpirun.relion')&&(/\/(?:sbgrid_bin|system\/bin)\//.test(real)||/\/(?:sbgrid_bin|system\/bin)\//.test(file)))throw Error('choose the version-specific program, not an SBGrid dispatcher');
   if(!(await fs.stat(real)).isFile())throw Error('not a regular file');
   await fs.access(real,constants.X_OK);
   if(!explicit){env[key]=file;log('Cluster setup: detected '+key+'='+file+(key==='RELIONDELUXE_MPIRUN'?' (from the current environment; MPI compatibility is not verified).':''));}
  }catch(e){if(explicit)errors.push(key+': '+file+' — '+e.message);else warn('Cluster setup: did not select '+file+' — '+e.message+'. Set '+key+' to a version-specific executable if needed.');}
 }
 if(errors.length)throw Error('Cluster startup found invalid explicit executable overrides:\n'+errors.join('\n')+'\nBash: export NAME=/absolute/path\nTcsh: setenv NAME /absolute/path\nUse an MPI launcher compatible with the installed RELION build.');
 const scripts=[];
 for(const name of await fs.readdir(directory).catch(()=>[])){
  if(!name.startsWith('relion'))continue;
  const file=path.join(directory,name);
  try{if((await fs.stat(file)).isFile()){await fs.access(file,constants.R_OK);scripts.push(file);}}catch{}
 }
 return scripts.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
