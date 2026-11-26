import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {resolveExecutable} from './executables.mjs';
import {tail} from './paths.mjs';
export function viewerCommand(file,nodeType=''){
 if(/^TomogramGroupMetadata\.star\.relion\.tomo\.(reconstruct|denoise)(?:\.|$)/.test(nodeType))return {executable:'relion_display',args:['--gui','--i',file]};
 if(nodeType.startsWith('TomogramGroupMetadata'))return {executable:'relion_python_tomo_view',args:['tilt-series','--tilt-series-star-file',file]};
 if(/\.pdf$/i.test(file))return {executable:'xdg-open',args:[file]};
 return {executable:'relion_display',args:/\.star$/i.test(file)?['--gui','--i',file]:['--i',file]};
}
export async function launchViewer(project,file,{env=process.env,startupMs=750,nodeType=''}={}){
 if(!env.DISPLAY&&!env.WAYLAND_DISPLAY)throw new Error('No desktop display is configured. Start the server from the workstation graphical session (or an SSH session with working X forwarding).');
 const command=viewerCommand(file,nodeType),executable=await resolveExecutable(command.executable,{cwd:project,env});
 if(!executable)throw new Error('Executable not found in server PATH: '+command.executable);
 const dir=path.join(project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true,mode:0o700});
 const log=path.join(dir,`viewer-${randomUUID()}.log`),handle=await fs.open(log,'wx',0o600);
 let child,outcome;
 try{
  child=spawn(executable,command.args,{cwd:project,env,detached:true,shell:false,stdio:['ignore',handle.fd,handle.fd]});
  outcome=await new Promise(resolve=>{
   const timer=setTimeout(()=>finish({running:true}),startupMs);
   const finish=result=>{clearTimeout(timer);resolve(result);};
   child.once('error',error=>finish({error}));
   child.once('exit',(code,signal)=>finish({code,signal}));
  });
  child.unref();
 }finally{await handle.close();}
 const output=(await tail(log,8192)).text.trim();
 if(outcome.error||(!outcome.running&&(outcome.code!==0||outcome.signal))){
  throw new Error(`Viewer failed to start: ${outcome.error?.message||outcome.signal||'exit code '+outcome.code}.\n${output||'No diagnostic output.'}\nLog: ${log}`);
 }
 return {pid:child.pid,log,message:(outcome.running?'Viewer launched on the workstation desktop.':'Viewer command completed.')+'\nLog: '+log+(output?'\n'+output:'')};
}
