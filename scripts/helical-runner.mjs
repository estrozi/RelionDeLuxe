// Launcher for RELION's standard External job interface. No reconstruction code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {resolveExecutable} from '../lib/executables.mjs';
const allArgs=process.argv.slice(2),separator=allArgs.indexOf('--'),extra=separator<0?[]:allArgs.slice(separator+1);
const args=separator<0?allArgs:allArgs.slice(0,separator),get=key=>{const i=args.indexOf(key);return i<0?'':args[i+1];};
const output=get('--o');
if(!/^InitialModelHelical\/job\d+\/$/.test(output||''))throw new Error('Invalid helical job directory');
const mark=async status=>{
 for(const name of ['SUCCESS','FAILURE','ABORTED'])if(name!==status)await fs.unlink(path.join(output,'RELION_JOB_EXIT_'+name)).catch(e=>{if(e.code!=='ENOENT')throw e;});
 await fs.writeFile(path.join(output,'RELION_JOB_EXIT_'+status),'');
};
let child,aborted=false,finished=false,timer,killTimer;
try{
 const binary=await resolveExecutable('relion_helix_inimodel2d');if(!binary)throw new Error('relion_helix_inimodel2d is not in PATH');
 const command=['--i',get('--in_parts'),'--angpix',get('--angpix'),'--mask_diameter',get('--mask_diameter'),'--j',get('--j'),'--crossover_distance',get('--crossover_distance'),'--o',output+'initial_model','--iter','1','--sym','1','--pipeline_control',output,...extra];
 console.log('Launching:',binary,...command);
 child=spawn(binary,command,{stdio:'inherit',detached:true,shell:false});
 const done=new Promise((resolve,reject)=>{child.once('error',e=>{finished=true;reject(e);});child.once('exit',(code,signal)=>{finished=true;resolve({code,signal});});});
 timer=setInterval(async()=>{
  if(aborted||finished)return;
  const requested=await fs.stat(path.join(output,'RELION_JOB_ABORT_NOW')).catch(()=>null);
  if(requested&&!finished){
   aborted=true;try{process.kill(-child.pid,'SIGTERM');}catch{}
   killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},1500);
  }
 },250);
 const result=await done;clearInterval(timer);clearTimeout(killTimer);
 if(aborted){await mark('ABORTED');process.exitCode=2;}
 else if(result.code!==0){throw new Error('Helical reconstruction exited '+(result.signal||result.code));}
 else{await fs.access(output+'initial_model_class001_rec3d.mrc');await mark('SUCCESS');}
}catch(e){clearInterval(timer);clearTimeout(killTimer);console.error(e.message);await mark(aborted?'ABORTED':'FAILURE');process.exitCode=1;}
