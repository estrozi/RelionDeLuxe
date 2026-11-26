import fs from 'node:fs/promises';
import path from 'node:path';
import {terminalConfirm} from './terminal-confirm.mjs';
const inside=(root,file)=>{const r=path.relative(root,file);return r===''||(!r.startsWith('..'+path.sep)&&r!=='..'&&!path.isAbsolute(r));};
export async function projectLinkWarnings(project,readRoots=[]){
 const roots=await Promise.all([project,...readRoots].map(p=>fs.realpath(p)));
 const warnings=[],pending=[roots[0]];
 // Walk actual project directories only: never recurse through symbolic links.
 while(pending.length){
  const dir=pending.pop();let entries;
  try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){warnings.push({file:dir,error:e.code||e.message});continue;}
  for(const entry of entries){
   const file=path.join(dir,entry.name);
   if(dir===roots[0]&&entry.name==='Trash')continue;
   if(entry.isSymbolicLink())try{
    const target=await fs.realpath(file);
    if(!roots.some(root=>inside(root,target))){
     const stat=await fs.stat(target);
     warnings.push({file,target,root:stat.isDirectory()?target:path.dirname(target)});
    }
   }catch(e){warnings.push({file,error:e.code||e.message});}
   else if(entry.isDirectory())pending.push(file);
  }
 }
 return warnings;
}
export async function confirmStartup(message,{accept=false,input=process.stdin,output=process.stdout,details=''}={}){
 if(accept)return;
 if(!input.isTTY)throw Error('Startup cancelled: confirmation requires an interactive terminal. Resolve the warnings or explicitly use --accept-startup-warnings to proceed unattended.');
 if(!await terminalConfirm(message,{input,output,details}))throw Error('Startup cancelled.');
}
export function linkWarningText(warnings){
 const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
 return 'WARNING: Some project links cannot be read with the current access settings:\n'+warnings.map(w=>'  '+w.file+' → '+(w.target||(w.error==='ENOENT'?'File not found':w.error))).join('\n')+
 '\nSuggested additional options (review before granting access):\n'+[...new Set(warnings.filter(w=>w.root).map(w=>'  --read-root '+quote(w.root)))].join('\n')+
 '\nBroken or unreadable links must be repaired separately; --read-root does not repair them. This scan does not follow linked directories or change permissions.';
}
