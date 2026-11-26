import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {readablePath,within} from './paths.mjs';
import {gainTiffToMrc} from './gain-tiff.mjs';
const hash=data=>createHash('sha256').update(data).digest('hex');
const LIMIT=512*1024*1024;
export function validateGainMrc(data,fileSize=data.length){
 if(data.length<1024)throw Error('Gain MRC has a truncated header.');
 const valid=[true,false].some(le=>{
  const read=o=>le?data.readInt32LE(o):data.readInt32BE(o);
  const dims=[read(0),read(4),read(8)],bytes=({0:1,1:2,2:4,3:4,4:8,6:2,12:2,16:3})[read(12)],extra=read(92);
  return dims.every(n=>n>0&&n<=65536)&&bytes&&extra>=0&&Number.isSafeInteger(dims.reduce((a,b)=>a*b)*bytes)&&1024+extra+dims.reduce((a,b)=>a*b)*bytes<=fileSize;
 });
 if(!valid)throw Error('Gain MRC has invalid dimensions, mode or incomplete data.');
}
export async function collectScreeningGains(project,roots,collection,progress=async()=>{},checkAbort=async()=>{}){
 const root=await readablePath(project,roots,collection),sources=[],kinds=new Map();let directories=0;
 async function walk(dir){
  await checkAbort();if(++directories>200000)throw Error('Gain search exceeds 200000 directories.');
  const stat=await fs.lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink())return;
  const real=await readablePath(project,roots,dir);if(!within(root,real))throw Error('Gain search escaped the data collection.');
  for(const e of await fs.readdir(real,{withFileTypes:true})){
   if(e.isDirectory())await walk(path.join(real,e.name));
   else if(e.isFile()&&/gain/i.test(e.name)){
    const file=path.join(real,e.name),h=await fs.open(file,'r');let kind;
    try{
     const st=await h.stat(),header=Buffer.alloc(Math.min(1024,st.size));await h.read(header,0,header.length,0);
     const sig=header.subarray(0,4).toString('hex');
     if(['49492a00','4d4d002a','49492b00','4d4d002b'].includes(sig))kind='tiff';
     else try{validateGainMrc(header,st.size);kind='mrc';}catch{}
     if(!kind&&/\.(tiff?|mrc)$/i.test(e.name))throw Error('Invalid gain image: '+file);
     if(!kind)continue;
    }finally{await h.close();}
    kinds.set(file,kind);
    if(sources.length>=1000)throw Error('More than 1000 gain files found; check the collection path.');
    sources.push(path.join(real,e.name));
   }
  }
 }
 await progress('Searching the data collection for gain TIFF/MRC files…');await walk(root);sources.sort();
 const names=sources.map(source=>path.basename(source,path.extname(source)).replace(/[\r\n\0'"]/g,'_')+'.mrc');
 const counts=new Map();for(const name of names)counts.set(name,(counts.get(name)||0)+1);
 const results=[];
 for(let i=0;i<sources.length;i++){
  await checkAbort();const source=sources[i],relative=path.relative(root,source),st=await fs.lstat(source);
  if(!st.isFile()||st.isSymbolicLink()||st.size>LIMIT)throw Error('Gain must be a regular file of at most 512 MiB: '+source);
  const safe=await readablePath(project,roots,source);if(!within(root,safe))throw Error('Gain source escapes the collection.');
  await progress((kinds.get(source)==='mrc'?'Copying':'Converting')+' gain '+(i+1)+' / '+sources.length+': '+relative);
  const input=await fs.readFile(safe);
  const warnings=[];let data;try{if(kinds.get(source)==='mrc'){validateGainMrc(input);data=input;}else data=gainTiffToMrc(input,{onWarning:message=>warnings.push(message)});}catch(e){throw Error(relative+': '+e.message);}
  for(const warning of warnings)await progress(relative+': '+warning);
  const after=await fs.stat(safe);if(after.size!==st.size||after.mtimeMs!==st.mtimeMs)throw Error('Gain changed while reading: '+source);
  await checkAbort();
  const suffix=hash(relative).slice(0,12),stem=names[i].slice(0,-4);
  let name=counts.get(names[i])>1?stem+'_'+suffix+'.mrc':names[i];
  const digest=hash(data);
  async function existing(name){
   const file=path.join(project,name),st=await fs.lstat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(!st)return 'absent';
   if(!st.isFile()||st.isSymbolicLink()||st.size!==data.length)return 'different';
   return hash(await fs.readFile(file))===digest?'identical':'different';
  }
  let state=await existing(name);
  if(state==='different'){name=stem+'_'+suffix+'.mrc';state=await existing(name);}
  if(state==='different')throw Error('Gain destination already contains different data: '+name);
  const reused=state==='identical';
  if(!reused){
   const temp=path.join(project,'.gain-'+randomUUID()+'.partial');
   try{await fs.writeFile(temp,data,{flag:'wx'});await checkAbort();await fs.link(temp,path.join(project,name));}
   finally{await fs.rm(temp,{force:true});}
  }
  results.push({source:relative,file:name,converted:kinds.get(source)!=='mrc',reused,sha256:digest,warnings});
 }
 await progress(results.length?'Prepared '+results.length+' gain reference(s) in the project folder.':'No gain TIFF/MRC files found; continuing without a gain reference.');
 return results;
}
