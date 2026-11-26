import fs from 'node:fs/promises';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';
const cache=new Map();
export async function polishingMicrographs(project,roots,file){
 try{
  const actual=await readablePath(project,roots,file),stat=await fs.stat(actual);
  const stamp=stat.size+':'+stat.mtimeMs+':'+stat.ctimeMs,old=cache.get(actual);
  if(old?.stamp===stamp)return old.valid;
  const blocks=parseStar(await fs.readFile(actual,'utf8'));
  const valid=blocks.some(b=>b.tables.some(t=>t.labels.includes('rlnMicrographName')&&t.labels.includes('rlnMicrographMetadata')));
  if(cache.size>1000)cache.clear();
  cache.set(actual,{stamp,valid});return valid;
 }catch{return false;}
}
