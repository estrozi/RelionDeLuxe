import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';

// Search the project and the usual raw-data folders only. A single matching
// project-level MTF takes precedence; multiple candidates at one level are
// ambiguous and should be chosen explicitly by the user.
export async function importMtfDefault(project,roots=[]){
 const names=await fs.readdir(project,{withFileTypes:true}).catch(()=>[]);
 const folders=['',...names.filter(entry=>['movies','micrographs','frames','mdoc'].includes(entry.name.toLowerCase())&&(entry.isDirectory()||entry.isSymbolicLink())).map(entry=>entry.name).sort((a,b)=>a.localeCompare(b))];
 const candidates=[];
 for(const folder of folders){
  let directory;
  try{directory=folder?await readablePath(project,roots,folder):await readablePath(project,roots,'.');}
  catch{continue;}
  let entries;
  try{entries=await fs.readdir(directory,{withFileTypes:true});}catch{continue;}
  for(const entry of entries){
   if(!/mtf.*\.star$/i.test(entry.name)||entry.name.startsWith('.')||!(entry.isFile()||entry.isSymbolicLink()))continue;
   const relative=folder?path.join(folder,entry.name):entry.name;
   try{if((await fs.stat(await readablePath(project,roots,relative))).isFile())candidates.push(relative);}catch{}
  }
 }
 const atRoot=candidates.filter(file=>!file.includes(path.sep));
 if(atRoot.length)return atRoot.length===1?atRoot[0]:null;
 return candidates.length===1?candidates[0]:null;
}
