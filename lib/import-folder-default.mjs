import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
// Inspect names/metadata only, never TIFF/MRC contents. No recursive scan:
// the proposed wildcard describes files directly inside the chosen folder.
export async function importFolderDefault(project,roots=[],folderNames=['Movies','Micrographs']){
 try{
  const folders=[];
  for(const name of folderNames){
   const item=await fs.lstat(path.join(project,name)).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(!item)continue;
   const resolved=await readablePath(project,roots,name);
   if((await fs.stat(resolved)).isDirectory())folders.push({name,resolved});
  }
  if(folders.length!==1)return null;
  const {name,resolved}=folders[0],counts=new Map();
  for(const item of await fs.readdir(resolved,{withFileTypes:true})){
   if(item.isDirectory()||!['mrc','tif','tiff'].includes(path.extname(item.name).slice(1).toLowerCase()))continue;
   if(item.isSymbolicLink()){
    const target=await readablePath(project,roots,path.join(name,item.name));
    if(!(await fs.stat(target)).isFile())continue;
   }else if(!item.isFile())continue;
   const ext=path.extname(item.name).slice(1),lower=ext.toLowerCase();
   const group=counts.get(lower)||{count:0,spellings:new Set()};
   group.count++;group.spellings.add(ext);counts.set(lower,group);
  }
  const ranked=[...counts].sort((a,b)=>b[1].count-a[1].count);
  if(!ranked.length||(ranked[1]&&ranked[0][1].count===ranked[1][1].count))return null;
  const [extension,{spellings:extensions}]=ranked[0];
  // Preserve a uniform spelling; mixed-case suffixes need a case-matching glob.
  const suffix=extensions.size===1?[...extensions][0]:[...extension].map(c=>'['+c+c.toUpperCase()+']').join('');
  return name+'/*.'+suffix;
 }catch{return null;} // Ambiguous or unreadable data must not change the default.
}
