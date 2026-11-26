import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveExecutable} from './executables.mjs';
export async function loadSBGrid({env=process.env,base='/programs',log=console.log}={}){
 // Avoid replacing an existing working RELION setup for a missing optional tool.
 const core=await Promise.all(['relion','relion_pipeliner','relion_image_handler'].map(n=>resolveExecutable(n,{env})));
 if(core.every(Boolean))return false;
 const flavor=path.basename(env.SHELL||'bash');
 const candidates=/^(t?csh)$/.test(flavor)?[[env.SHELL,'sbgrid.cshrc'],['/bin/bash','sbgrid.shrc']]:[[['bash','zsh'].includes(flavor)?env.SHELL:'/bin/bash','sbgrid.shrc'],['/bin/tcsh','sbgrid.cshrc'],['/bin/csh','sbgrid.cshrc']];
 for(const [shell,rc] of candidates){
  if(!shell)continue;
  const file=path.join(base,rc);
  try{await fs.access(file);await fs.access(shell);}catch{continue;}
  const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  const runtime=await resolveExecutable(process.execPath);
  if(!runtime)return false;
  const code="process.stdout.write('RELIONDELUXE_ENV='+JSON.stringify(process.env))";
  try{
   log('Loading SBGrid from '+file+' using '+shell+'…');
   const {stdout}=await promisify(execFile)(shell,['-f','-c','source '+quote(file)+' && '+quote(runtime)+' -e '+quote(code)],{env,timeout:30000,maxBuffer:4*1024*1024});
   const at=stdout.lastIndexOf('RELIONDELUXE_ENV=');
   if(at<0)throw Error('No environment returned');
   const loaded=JSON.parse(stdout.slice(at+'RELIONDELUXE_ENV='.length));
   if(!loaded.PATH)throw Error('No PATH returned');
   for(const key of Object.keys(env))if(!(key in loaded))delete env[key];
   Object.assign(env,loaded);
   log('SBGrid environment loaded for this server and its jobs.');return true;
  }catch(e){log('Could not load SBGrid: '+e.message);}
 }
 return false;
}
