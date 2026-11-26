import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {resolveExecutable} from './executables.mjs';
export async function terminalConfirm(message,{input=process.stdin,output=process.stdout,details=''}={}){
 if(!input.isTTY)throw Error('Confirmation requires an interactive terminal.');
 const executable=output.isTTY&&process.env.TERM!=='dumb'?await resolveExecutable('whiptail'):null;
 if(executable){
  if(details){
   const dir=await fs.mkdtemp(path.join(os.tmpdir(),'relion-startup-'));
   try{
    const file=path.join(dir,'warning.txt');await fs.writeFile(file,details,{mode:0o600});
    const reviewed=await new Promise(resolve=>{
     const child=spawn(executable,['--title','RelionDeLuxe · Warning details','--scrolltext','--textbox',file,'0','0'],{stdio:'inherit'});
     child.once('error',()=>resolve(null));child.once('exit',code=>resolve(code));
    });
    if(reviewed===255)return false;
    // If the details screen failed, use the readable terminal fallback.
    if(reviewed!==0){const rl=createInterface({input,output});try{return /^y(?:es)?$/i.test((await rl.question(details+'\n\n'+message+' [y/N] ')).trim());}finally{rl.close();}}
   }finally{await fs.rm(dir,{recursive:true,force:true});}
  }
  const result=await new Promise(resolve=>{
   const child=spawn(executable,['--title','RelionDeLuxe · Confirm','--defaultno','--yesno',message,'12','72'],{stdio:'inherit'});
   child.once('error',()=>resolve(null));child.once('exit',code=>resolve(code));
  });
  if(result===0)return true;
  if(result===1||result===255)return false;
 }
 const rl=createInterface({input,output});
 try{return /^y(?:es)?$/i.test((await rl.question((details?details+'\n\n':'')+message+' [y/N] ')).trim());}finally{rl.close();}
}
