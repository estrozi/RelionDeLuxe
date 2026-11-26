import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath,within} from './paths.mjs';
// STAR lexical values retain quoting so quoted reserved words remain data.
export function parseStar(text){
 const tokens=[];let i=0;
 while(i<text.length){if(/\s/.test(text[i])){i++;continue;}if(text[i]==='#'){while(i<text.length&&text[i]!=='\n')i++;continue;}
  let value='',quoted=false;
  if(text[i]===';'&&(i===0||text[i-1]==='\n')){quoted=true;i++;const end=text.indexOf('\n;',i);if(end<0)throw Error('Unterminated STAR multiline value');value=text.slice(i,end);i=end+2;}
  else if(text[i]==='"'||text[i]==="'"){quoted=true;const q=text[i++];let closed=false;while(i<text.length){if(text[i]===q&&(i+1===text.length||/\s/.test(text[i+1]))){i++;closed=true;break;}value+=text[i++];}if(!closed)throw Error('Unterminated STAR quote');}
  else{while(i<text.length&&!/\s/.test(text[i]))value+=text[i++];}
  tokens.push({value,quoted});
 }
 const blocks=[];let block={name:'',values:{},tables:[]};blocks.push(block);
 const reserved=t=>!t.quoted&&(/^(data_|loop_|stop_|save_)/i.test(t.value)||t.value.startsWith('_'));
 for(i=0;i<tokens.length;){const t=tokens[i++];if(!t.quoted&&/^data_/i.test(t.value)){block={name:t.value.slice(5),values:{},tables:[]};blocks.push(block);}
 else if(t.value==='loop_'&&!t.quoted){const labels=[];while(i<tokens.length&&!tokens[i].quoted&&tokens[i].value.startsWith('_'))labels.push(tokens[i++].value.slice(1));if(!labels.length)throw Error('STAR loop without columns');const rows=[];while(i<tokens.length&&!reserved(tokens[i])){const row={};for(const label of labels){if(i>=tokens.length||reserved(tokens[i]))throw Error('Incomplete STAR row');row[label]=tokens[i++].value;}rows.push(row);}block.tables.push({labels,rows});}
 else if(t.value.startsWith('_')&&!t.quoted){if(i>=tokens.length)throw Error('Missing STAR value');block.values[t.value.slice(1)]=tokens[i++].value;}}
 return blocks;
}
export async function galleryManifest(project,roots,input,memberClass=null){
 if(memberClass!==null&&(!Number.isSafeInteger(memberClass)||memberClass<1))throw Error('Invalid class number');
 let memberData=false,memberSource=null,classDataFile=null;
 let file=input;const visited=new Set();
 for(let depth=0;depth<4;depth++){
  const actual=await readablePath(project,roots,file);if(visited.has(actual))throw Error('Circular optimiser reference');visited.add(actual);
  if(!/\.star$/i.test(actual))throw Error('Choose an optimiser, model or image STAR file.');
  if((await fs.stat(actual)).size>(memberData?256:32)*1024*1024)throw Error('STAR file exceeds the '+(memberData?256:32)+' MiB gallery limit. Use a subset or the native viewer.');
  const blocks=parseStar(await fs.readFile(actual,'utf8'));
  const model=blocks.find(b=>b.values.rlnModelStarFile)?.values.rlnModelStarFile;
  if(model){
   const data=blocks.find(b=>b.values.rlnExperimentalDataStarFile)?.values.rlnExperimentalDataStarFile;
   if(memberClass!==null){if(!data)throw Error('Optimiser has no experimental data STAR reference');file=data;memberData=true;}
   else{memberSource=data?input:null;classDataFile=data||null;file=model;}continue;
  }
  if(memberClass!==null&&!memberData)throw Error('Class members require an optimiser STAR file');
  const optics=blocks.find(b=>b.name==='optics')?.tables[0]?.rows||[];
  const imageLabels=['rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2','rlnTomogramProjection','rlnTomogramProjectionHalf1','rlnTomogramProjectionHalf2','rlnTomogramHProjectionalf2','rlnReferenceImage','rlnImageName','rlnCtfImage','rlnCtfPowerSpectrum','rlnMicrographName'];
  const tables=blocks.flatMap(b=>b.tables);
  let table=memberData?tables.find(t=>t.labels.includes('rlnImageName')&&t.labels.includes('rlnClassNumber')):imageLabels.map(label=>tables.find(t=>t.labels.includes(label))).find(Boolean);
  if(!table)throw Error(memberData?'Particle data requires rlnImageName and rlnClassNumber columns.':'No supported image column found. Use the native viewer for this file.');
  if(memberData)table={...table,rows:table.rows.filter(r=>Number(r.rlnClassNumber)===memberClass)};
  const imageColumns=imageLabels.filter(label=>table.labels.includes(label));
  if(table.rows.length>200000)throw Error('Gallery supports up to 200000 images; use a subset.');
  return {file,classDataFile,memberClass,memberSource:memberSource&&imageColumns.includes('rlnReferenceImage')&&table.rows.every(r=>/^\d+@/.test(r.rlnReferenceImage))?memberSource:null,imageColumns,labels:table.labels,rows:table.rows.map((row,index)=>({index,...row,pixelSize:Number(optics.find(o=>o.rlnOpticsGroup===row.rlnOpticsGroup)?.rlnImagePixelSize||row.rlnImagePixelSize||blocks.find(b=>b.values.rlnPixelSize)?.values.rlnPixelSize)||null}))};
 }
 throw Error('Too many optimiser references');
}
function half(v){const sign=v&32768?-1:1,e=(v>>10)&31,f=v&1023;return sign*(e===0?2**-14*f/1024:e===31?(f?NaN:Infinity):2**(e-15)*(1+f/1024));}
export async function galleryImagePath(project,roots,reference){
 try{return await readablePath(project,roots,reference);}catch(e){
  if(e.code!=='ENOENT')throw e;
  const target=path.resolve(project,reference),relative=path.relative(project,target);
  if(within(project,target)&&!relative.startsWith('Trash/')){
   const trash=path.join('Trash',relative);
   const found=await readablePath(project,[],trash).then(()=>true,()=>false);
   if(found)throw Error(`Image unavailable: ${reference}. A matching file is in ${trash}. The job may have been gently or harshly cleaned, or moved to Trash. Cleaning removes these images from their original location while the STAR file may still reference them.`);
  }
  throw Error(`Image unavailable: ${reference}. The file is missing. The job may have been gently or harshly cleaned (including through native RELION), or the file moved or deleted. Check the project's Trash folder; if it was emptied, the image must be restored from a backup or regenerated.`);
 }
}
export async function galleryImage(project,roots,reference,widthLimit=512,centralSlice=false,axis='Z',preserveNonfinite=false,sliceFraction=null){
 if(!reference||['N/A','None','?','.'].includes(String(reference)))throw Error('No image is recorded in the selected STAR column for this tomogram. Denoising may not have been performed for this row.');
 const forcedMrc=/:mrcs?$/i.test(String(reference));reference=String(reference).replace(/:mrcs?$/i,'');
 const m=String(reference).match(/^(\d+)@(.+)$/);let index=m?Number(m[1])-1:0;const file=await galleryImagePath(project,roots,m?m[2]:reference);
 if(!forcedMrc&&!/\.(mrcs|mrc|map|ctf)$/i.test(file))throw Error('Gallery supports MRC/MRCS images. Use the native viewer for other formats.');
 const handle=await fs.open(file,'r');try{
 const header=Buffer.alloc(1024);if((await handle.read(header,0,1024,0)).bytesRead!==1024)throw Error('Incomplete MRC header');
 const little=!(header[212]===17&&header[213]===17),read=o=>little?header.readInt32LE(o):header.readInt32BE(o);
 let [nx,ny,nz,mode,extra]=[read(0),read(4),read(8),read(12),read(92)],bytes=({0:1,1:2,2:4,6:2,12:2})[mode];
 if(!bytes||nx<1||ny<1||nx>16384||ny>16384||nx*ny>32*1024*1024||nz<1||extra<0||!Number.isSafeInteger(index)||index<0||index>=nz)throw Error('Unsupported MRC dimensions, mode or image index');
 if(!m&&nz>1){if(!centralSlice)throw Error('This is a 3D volume. Open it with the 3D viewer.');index=Math.floor(nz/2);}
 if(!['X','Y','Z'].includes(axis))throw Error('Invalid slice direction');
 const dimensions=[nx,ny,nz],axisIndex={X:0,Y:1,Z:2}[axis];
 if(sliceFraction!==null&&(!Number.isFinite(sliceFraction)||sliceFraction<0||sliceFraction>1))throw Error('Invalid slice position');
 const slice=sliceFraction===null?Math.floor(dimensions[axisIndex]/2):Math.round(sliceFraction*(dimensions[axisIndex]-1));
 if(!m&&centralSlice&&axis==='Z')index=slice;
 const float=o=>little?header.readFloatLE(o):header.readFloatBE(o);
 const voxelSize=[0,1,2].map(i=>read(28+4*i)>0?float(40+4*i)/read(28+4*i):0);
 const planeSize=nx*ny*bytes,base=1024+extra,stat=await handle.stat();
 const readInto=async(buffer,offset)=>{let done=0;while(done<buffer.length){const r=await handle.read(buffer,done,buffer.length-done,offset+done);if(!r.bytesRead)throw Error('Truncated MRC image');done+=r.bytesRead;}};
 let buffer;
 if(!m&&centralSlice&&axis!=='Z'){
  if(nz>16384||(axis==='X'?ny:nx)*nz>32*1024*1024)throw Error('Unsupported slice dimensions');
  if(base+planeSize*nz>stat.size)throw Error('Truncated MRC image');
  const w=axis==='X'?ny:nx;buffer=Buffer.alloc(w*nz*bytes);
  const slab=Buffer.alloc(axis==='X'?planeSize:nx*bytes);
  for(let z=0;z<nz;z++){
   await readInto(slab,base+z*planeSize+(axis==='Y'?slice*nx*bytes:0));
   if(axis==='Y')slab.copy(buffer,z*w*bytes);
   else for(let y=0;y<ny;y++){const p=(y*nx+slice)*bytes;slab.copy(buffer,(z*w+y)*bytes,p,p+bytes);}
  }
  nx=w;ny=nz;
 }else{const offset=base+index*planeSize;if(offset+planeSize>stat.size)throw Error('Truncated MRC image');buffer=Buffer.alloc(planeSize);await readInto(buffer,offset);}
 const width=Math.min(nx,widthLimit),height=Math.max(1,Math.round(ny*width/nx)),output=Buffer.alloc(8+width*height*4);output.writeUInt32LE(width,0);output.writeUInt32LE(height,4);
 const value=p=>mode===0?buffer.readInt8(p):mode===1?(little?buffer.readInt16LE(p):buffer.readInt16BE(p)):mode===2?(little?buffer.readFloatLE(p):buffer.readFloatBE(p)):mode===12?half(little?buffer.readUInt16LE(p):buffer.readUInt16BE(p)):(little?buffer.readUInt16LE(p):buffer.readUInt16BE(p));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const v=value((Math.min(ny-1,Math.floor(y*ny/height))*nx+Math.floor(x*nx/width))*bytes);output.writeFloatLE(preserveNonfinite||Number.isFinite(v)?v:0,8+4*(y*width+x));}
 return {output,scale:width/nx,nx,ny,dimensions,voxelSize,slice,axis};
 }finally{await handle.close();}
}
