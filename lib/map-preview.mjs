import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
// Limit preview memory use, without restricting maps accepted by RELION itself.
export async function openMapPreview(project,roots,input){
 const file=await readablePath(project,roots,input);
 if(!/\.(mrc|map)$/i.test(path.extname(file)))throw Error('Preview supports uncompressed MRC/MAP volumes.');
 const handle=await fs.open(file,'r');
 try{
  const stat=await handle.stat();if(!stat.isFile()||stat.size<1024)throw Error('Invalid MRC map file');
  if(stat.size>512*1024*1024)throw Error('This map exceeds the 512 MiB browser preview limit. Use a smaller map for preview; RELION can still run with this input.');
  const header=Buffer.alloc(1024);await handle.read(header,0,1024,0);
  let valid=false;
  for(const little of [true]){
   const read=i=>little?header.readInt32LE(i):header.readInt32BE(i);
   const dims=[read(0),read(4),read(8)],mode=read(12),extra=read(92),bytes=({0:1,2:4})[mode];
   const voxels=dims.reduce((a,b)=>a*b,1);
   if(dims.every(x=>x>1&&x<=8192)&&bytes&&extra>=0&&voxels<=128*1024*1024&&1024+extra+voxels*bytes<=stat.size){valid=true;break;}
  }
  if(!valid)throw Error('Unsupported or incomplete MRC volume. Preview accepts little-endian modes 0 and 2 and up to 128 million voxels.');
  return {handle,size:stat.size};
 }catch(e){await handle.close();throw e;}
}

export function isMaskPreview(project,input,state,layout){
 const canonical=file=>{
  if(typeof file!=='string')return '';
  let value=(path.isAbsolute(file)?path.relative(project,file):file).replace(/^\.\//,'');
  const alias=(state.jobs||[]).filter(j=>j.alias&&j.alias!=='None').sort((a,b)=>b.alias.length-a.alias.length).find(j=>value.startsWith(j.alias.endsWith('/')?j.alias:j.alias+'/'));
  return alias?alias.name+value.slice(alias.alias.replace(/\/$/,'').length+1):value;
 };
 const file=canonical(input);
 if((state.nodes||[]).some(n=>canonical(n.name)===file&&/^Mask3D(?:\.|$)/.test(n.type||'')))return true;
 return (state.jobs||[]).some(j=>layout.find(l=>l.id===j.type)?.name==='Mask creation'&&(j.outputs||[]).some(output=>canonical(output)===file));
}
