import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {readablePath} from './paths.mjs';
import {gainTiffToMrc} from './gain-tiff.mjs';
import {validateGainMrc} from './screening-gains.mjs';

const digest=data=>createHash('sha256').update(data).digest('hex');
const maxBytes=512*1024*1024;

// Return only a native MRC path; never change the source gain or guess on invalid data.
export async function motionGainReference(project,roots,candidate,{convert=true}={}){
 const source=await readablePath(project,roots,candidate),stat=await fs.stat(source);
 if(!stat.isFile()||stat.size>maxBytes)throw Error('Gain reference must be a file of at most 512 MiB: '+candidate);
 const data=await fs.readFile(source),signature=data.subarray(0,4).toString('hex');
 const tiff=['49492a00','4d4d002a','49492b00','4d4d002b'].includes(signature);
 if(!tiff){validateGainMrc(data);if(/\.mrc$/i.test(candidate))return candidate;}
 if(!convert)return null;
 const output=tiff?gainTiffToMrc(data):(validateGainMrc(data),data);
 const folder=path.join(project,'.reliondeluxe','converted-gains');
 await fs.mkdir(folder,{recursive:true});await readablePath(project,[],folder);
 const name=digest(data)+'.mrc',target=path.join(folder,name);
 const existing=await fs.lstat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
 if(existing){if(!existing.isFile()||digest(await fs.readFile(target))!==digest(output))throw Error('Converted gain destination differs: '+target);}
 else{
  const temporary=path.join(folder,'.'+randomUUID()+'.partial');
  try{await fs.writeFile(temporary,output,{flag:'wx'});try{await fs.link(temporary,target);}catch(error){if(error.code!=='EEXIST')throw error;if(digest(await fs.readFile(target))!==digest(output))throw Error('Converted gain destination differs: '+target);}}
  finally{await fs.rm(temporary,{force:true});}
 }
 return path.relative(project,target);
}
