import {spawn} from 'node:child_process';
import {resolveExecutable} from './executables.mjs';
export function localDesktop(env=process.env,platform=process.platform){
 if(env.SSH_CONNECTION||env.SSH_CLIENT||env.SSH_TTY||env.CI)return false;
 if(platform==='darwin'||platform==='win32')return true;
 return Boolean(env.DISPLAY||env.WAYLAND_DISPLAY);
}
export async function openLocalBrowser(url,{env=process.env,platform=process.platform,disabled=false}={}){
 if(disabled||!localDesktop(env,platform))return false;
 // Use argument arrays, never a shell: the token URL remains a single argument.
 const candidates=platform==='darwin'?[['open',url]]:platform==='win32'?[]:[['xdg-open',url],['gio','open',url]];
 for(const [name,...args] of candidates){
  const executable=await resolveExecutable(name,{env});if(!executable)continue;
  await new Promise((resolve,reject)=>{
   const child=spawn(executable,args,{env,detached:true,stdio:'ignore'});
   child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
  });
  return true;
 }
 return false;
}
