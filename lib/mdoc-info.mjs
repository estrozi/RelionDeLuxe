import fs from 'node:fs/promises';
import {matchingFiles} from './file-pattern.mjs';
export async function mdocInfo(project,readRoots,pattern){
 if(typeof pattern!=='string'||!pattern.trim())throw Error('Enter an .mdoc file pattern first.');
 const files=(await matchingFiles(project,readRoots,pattern)).filter(f=>/\.mdoc$/i.test(f));
 const doses=new Set(),frames=new Set();
 for(const file of files){const text=await fs.readFile(await (await import('./paths.mjs')).readablePath(project,readRoots,file),'utf8');
  for(const m of text.matchAll(/^\s*ExposureDose\s*=\s*([-+]?\d+(?:\.\d*)?(?:[eE][-+]?\d+)?)\s*$/gm))doses.add(Number(m[1]));
  for(const m of text.matchAll(/^\s*NumSubFrames\s*=\s*(\d+)\s*$/gm))frames.add(Number(m[1]));
 }
 return {files:files.length,fileNames:files,dose:doses.size===1?[...doses][0]:null,doseValues:[...doses].sort((a,b)=>a-b),numSubFrames:frames.size===1?[...frames][0]:null,numSubFrameValues:[...frames].sort((a,b)=>a-b)};
}
