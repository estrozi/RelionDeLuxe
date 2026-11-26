import {collectScreeningGains} from './screening-gains.mjs';
import {starValue} from './settings.mjs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createReadStream,createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {tiffFrameCount} from './tiff-frames.mjs';
import {frameHint} from './import-frames.mjs';
import {resolveExecutable} from './executables.mjs';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readablePath,within,jobPath} from './paths.mjs';
export const SCREENING=1002;
const field=(key,label,value,help)=>({key,label,default:value,help,type:0,nodeType:'',nodeDepth:1,pattern:'',choices:[]});
export const screeningSchema={id:SCREENING,options:[
 field('collection_path','Path to data collection:','','Directory on the server. External collections must be allowed with --read-root /path/to/collection when starting the server. Scans FoilHole_*_Data_*.jpg recursively; symbolic links are not followed.'),
 field('data_suffix','Suffix of data files:','_Fractions','Appended to the JPEG basename to locate the full-size TIFF or MRC in the same remote directory.'),
 {...field('data_extension','Data file extension:','auto','Case-insensitive matching for .tif, .tiff and .mrc raw data.'),type:4,choices:['auto','tif','tiff','mrc'],choiceLabels:{auto:'auto (case insensitive)',tif:'.tif (case insensitive)',tiff:'.tiff (case insensitive)',mrc:'.mrc (case insensitive)'}},
 field('destination_folder','Output folder (automatic):','Auto','Determined from one selected file: Movies for multiple frames, Micrographs for one frame. The folder must not already exist.'),
 field('jpg_folder','Local JPEG folder:','JPGs','Project-relative preview folder. A separate job subfolder preserves the collection tree and prevents collisions. JPEGs are copied first; saving the selection then copies the selected full-size files.')
]};
export const screeningLayout={id:SCREENING,label:'relion.external.screening',name:'Screening',custom:true,number:'00',directory:'External',tabs:{'I/O':screeningSchema.options.map(f=>f.key)},fields:{destination_folder:{toggle:'TOGGLE_ALWAYS_DEACTIVATE'}},overrides:{}};
export const shellQuote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export function screeningValues(v){return JSON.parse(Buffer.from(v.param1_value,'base64url').toString()).values;}
export function validateScreening(values){
 const v={...Object.fromEntries(screeningSchema.options.map(f=>[f.key,f.default])),...values};
 for(const [key,value] of Object.entries(v))if(typeof value!=='string'||/[\0\r\n]/.test(value))throw Error('Invalid '+key);
 if(!v.collection_path.trim())throw Error('Path to data collection is required (I/O tab).');
 if(/[\/\\]/.test(v.data_suffix))throw Error('Data suffix must not contain a directory separator.');
 v.data_extension=v.data_extension.trim().toLowerCase().replace(/^\./,'');
 if(!['auto','tif','tiff','mrc'].includes(v.data_extension))throw Error('Data extension must be auto, tif, tiff or mrc.');
 for(const key of ['destination_folder','jpg_folder']){
  if(!v[key]||path.isAbsolute(v[key])||v[key].split(/[\/\\]/).some(x=>!x||x==='.'||x==='..'))throw Error(key+' must be a project-relative folder without . or .. components.');
  if(['.reliondeluxe','Trash','.Nodes'].includes(v[key].split('/')[0]))throw Error('Choose a data folder, not project metadata or Trash.');
 }
 if(within(v.jpg_folder,v.destination_folder)||within(v.destination_folder,v.jpg_folder))throw Error('JPEG and full-size data folders must be separate.');
 return v;
}
// Refuse symlink components for all write destinations, including existing leaves.
export async function localPath(project,relative,mkdir=false){
 if(path.isAbsolute(relative)||relative.split('/').some(x=>x==='..'||x==='.')||!relative)throw Error('Invalid local path');
 let target=project;
 for(const part of relative.split('/').filter(Boolean)){
  target=path.join(target,part);
  if(mkdir)await fs.mkdir(target).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const st=await fs.lstat(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(st?.isSymbolicLink())throw Error('Symbolic-link destination is not allowed: '+target);
  if(mkdir&&st&&!st.isDirectory())throw Error('Not a directory: '+target);
 }
 return target;
}
async function atomic(project,relative,text,mode=0o600){
 const file=await localPath(project,relative),temp=file+'.'+randomUUID()+'.tmp';
 await fs.writeFile(temp,text,{flag:'wx',mode});try{await fs.rename(temp,file);}finally{await fs.rm(temp,{force:true});}
}
export async function prepareScreening(project,roots,job,values,progress=()=>{},checkAbort=async()=>{},context={}){
 jobPath(project,job);const v=validateScreening(values),source=await readablePath(project,roots,v.collection_path);
 if(!(await fs.stat(source)).isDirectory())throw Error('Data collection is not a directory.');
 const previewBase=v.jpg_folder+'/'+job.replace(/\/$/,'');
 const target=await localPath(project,previewBase,true);
 if(within(source,target)||within(target,source))throw Error('Collection and preview folders must not overlap.');
 const previous=new Map((context.previousRows||[]).map(r=>[r.jpeg,r]));
 const selectedSources=new Set(context.selectedSources||[]),preparedDirs=new Set();
 const rows=[];let visited=0,totalBytes=0,copiedPreviews=0,reusedPreviews=0;
 async function walk(dir){
  await checkAbort();if(++visited>200000)throw Error('Collection exceeds 200000 directories.');
  dir=await readablePath(project,roots,dir);
  if(!within(source,dir))throw Error('Preview directory escaped the collection.');
  const entries=await fs.readdir(dir,{withFileTypes:true});entries.sort((a,b)=>a.name.localeCompare(b.name));
  const dataByStem=new Map();
  for(const e of entries)if(e.isFile()&&(v.data_extension==='auto'?/\.(tiff?|mrc)$/i.test(e.name):path.extname(e.name).toLowerCase()==='.'+v.data_extension)){
   const stem=path.parse(e.name).name;dataByStem.set(stem,[...(dataByStem.get(stem)||[]),e]);
  }
  for(const ent of entries){
   await checkAbort();
   if(ent.isDirectory()){await walk(path.join(dir,ent.name));continue;}
   if(!ent.isFile()||!/^FoilHole_.*_Data_.*\.jpe?g$/i.test(ent.name))continue;
   if(rows.length>=100000)throw Error('Collection exceeds 100000 JPEG previews.');
   const relative=path.relative(source,path.join(dir,ent.name)),stem=ent.name.replace(/\.jpe?g$/i,'')+v.data_suffix;
   const matches=dataByStem.get(stem)||[];
   const raw=matches.length===1?path.join(dir,matches[0].name):null;
   const error=matches.length===0?'No matching full-size file':matches.length>1?'Multiple full-size files match; specify the data extension':'';
   const src=path.join(dir,ent.name),st=await fs.lstat(src);
   if(!st.isFile()||st.isSymbolicLink())throw Error('Preview is not a regular file: '+relative);
   if(st.size>32*1024*1024)throw Error('JPEG exceeds 32 MiB: '+relative);
   totalBytes+=st.size;if(totalBytes>20*1024**3)throw Error('JPEG previews exceed 20 GiB.');
   const parent=path.dirname(previewBase+'/'+relative);
   if(!preparedDirs.has(parent)){await localPath(project,parent,true);preparedDirs.add(parent);}
   const local=path.join(project,previewBase,relative);
   const prior=previous.get(previewBase+'/'+relative),old=await fs.lstat(local).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(old?.isSymbolicLink()||(old&&!old.isFile()))throw Error('Unsafe preview destination: '+local);
   const fingerprint={source:src,size:st.size,mtime:st.mtimeMs};
   const reuse=context.continuation&&old?.isFile()&&prior?.fingerprint&&
    Object.keys(fingerprint).every(k=>prior.fingerprint[k]===fingerprint[k])&&
    old.size===st.size&&old.mtimeMs===prior.previewMtime;
   if(reuse)reusedPreviews++;
   else{
    if(context.continuation){const temp=local+'.'+randomUUID()+'.tmp';try{await fs.copyFile(src,temp,constants.COPYFILE_EXCL);await fs.rename(temp,local);}finally{await fs.rm(temp,{force:true});}}
    else await fs.copyFile(src,local,constants.COPYFILE_EXCL);
    const after=await fs.stat(src);
    if(after.size!==st.size||after.mtimeMs!==st.mtimeMs||after.ctimeMs!==st.ctimeMs)throw Error('Preview changed during copying: '+relative);
    copiedPreviews++;
   }
   const localStat=reuse?old:await fs.stat(local);
   rows.push({index:rows.length,jpeg:previewBase+'/'+relative,relative,source:raw,error,fingerprint,previewMtime:localStat.mtimeMs,previewCtime:localStat.ctimeMs});
   if(rows.length%100===0)await progress('Checked '+rows.length+' JPEG previews: '+copiedPreviews+' copied, '+reusedPreviews+' unchanged…');
  }
 }
 await walk(source);
 if(!rows.length)throw Error('No FoilHole_*_Data_*.jpg previews found in the collection.');
 const revision=randomUUID(),manifest={version:2,job,values:v,revision,rows,previewCounts:{copied:copiedPreviews,reused:reusedPreviews},continuation:!!context.continuation,previousFolder:context.previousFolder||null,initialSelection:rows.filter(r=>selectedSources.has(r.source)).map(r=>r.index)};
 await atomic(project,job+'screening.json',JSON.stringify(manifest));
 await progress('Ready: '+rows.length+' JPEG previews. Select images in the screening gallery.');
 return manifest;
}
const manifestCache=new Map();
export async function screeningManifest(project,job){
 jobPath(project,job);const file=await localPath(project,job+'screening.json'),st=await fs.stat(file),stamp=st.mtimeMs+':'+st.size;
 if(st.size>128*1024*1024)throw Error('Screening manifest is too large.');
 let cached=manifestCache.get(file);if(cached?.stamp!==stamp){cached={stamp,data:JSON.parse(await fs.readFile(file,'utf8'))};manifestCache.set(file,cached);if(manifestCache.size>8)manifestCache.delete(manifestCache.keys().next().value);}
 return cached.data;
}
export function selectedScreeningRows(manifest,indices){
 if(!Array.isArray(indices)||(!indices.length&&!(manifest.continuation&&manifest.previousFolder))||indices.length>100000||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||!manifest.rows[i]))throw Error('Select one or more distinct previews.');
 const selected=indices.slice().sort((a,b)=>a-b).map(i=>manifest.rows[i]),names=new Set();
 for(const row of selected){
  if(row.error||!row.source)throw Error(row.relative+': '+(row.error||'Full-size file is missing'));
  const name=path.basename(row.source);
  if(names.has(name))throw Error('Duplicate destination filename: '+name+'. Select only one or use separate screening jobs/folders.');
  names.add(name);
 }
 return selected;
}
export async function saveScreening(project,roots,job,revision,indices){
 const manifest=await screeningManifest(project,job);if(manifest.revision!==revision)throw Error('Screening input changed; reload the gallery.');
 if(manifest.version!==2)throw Error('This screening job uses the older script workflow. Create a new screening job for automatic copying.');
 selectedScreeningRows(manifest,indices); // Validate indices, matches and duplicate basenames.
 if(!await resolveExecutable('relion_image_handler',{cwd:project}))throw Error('relion_image_handler is not available in the server PATH.');
 // The worker validates source paths and metadata once before copying.
 await atomic(project,job+'selected.json',JSON.stringify({revision,indices}));
 await atomic(project,job+'SCREENING_SAVED','');
 return {name:job,count:indices.length,copying:true};
}
export async function copyScreenedFiles(project,roots,job,progress=async()=>{},checkAbort=async()=>{}){
 const manifest=await screeningManifest(project,job),saved=JSON.parse(await fs.readFile(await localPath(project,job+'selected.json'),'utf8'));
 if(saved.revision!==manifest.revision)throw Error('Selection does not match screening input.');
 const rows=selectedScreeningRows(manifest,saved.indices);
 await checkAbort();await progress('Checking selected file metadata…');
 // Bounded concurrency hides network metadata latency without flooding the server.
 const sources=new Array(rows.length);let cursor=0;
 await Promise.all(Array.from({length:Math.min(16,rows.length)},async()=>{
  while(cursor<rows.length){const i=cursor++;await checkAbort();
   const source=await readablePath(project,roots,rows[i].source),st=await fs.stat(source);
   if(!st.isFile())throw Error('Not a data file: '+source);
   sources[i]={source,size:st.size,mtime:st.mtimeMs,ctime:st.ctimeMs};
  }
 }));
 const first=sources[0],framePath=job+'screening-frames.json';
 const cached=await fs.readFile(await localPath(project,framePath),'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return null;throw e;});
 let frames;
 if(cached&&(!first||['source','size','mtime'].every(k=>cached[k]===first[k]))&&Number.isInteger(cached.frames)&&cached.frames>0)frames=cached.frames;
 else{
  if(!first)throw Error('Cannot determine the output folder for an empty selection; continue once with a selected file first.');
  await progress('Checking frames in the first selected file…');
  frames=await tiffFrameCount(first.source,checkAbort);
  if(frames===null){
   await progress('Reading frame statistics (non-TIFF input)…');
   const exe=await resolveExecutable('relion_image_handler',{cwd:project});if(!exe)throw Error('relion_image_handler is not available in PATH.');
   const {stdout}=await promisify(execFile)(exe,['--i',first.source,'--stats'],{cwd:project,timeout:60000,maxBuffer:8*1024*1024});
   frames=frameHint(stdout).frames;
  }
  const after=await fs.stat(first.source);
  if(after.size!==first.size||after.mtimeMs!==first.mtime||after.ctimeMs!==first.ctime)throw Error('Source changed during frame detection: '+first.source);
  await atomic(project,framePath,JSON.stringify({...first,frames}));
 }
 const folder=frames>1?'Movies':'Micrographs',target=await localPath(project,folder);
 if(manifest.previousFolder&&manifest.previousFolder!==folder)throw Error('Detected frame type changed since the previous run; start a new screening job.');
 await checkAbort();
 try{await fs.mkdir(target);}catch(e){if(e.code==='EEXIST'&&manifest.continuation){if(!(await fs.lstat(target)).isDirectory())throw Error('Destination is not a directory: '+folder);}else if(e.code==='EEXIST')throw Error(folder+' already exists. Move or rename that folder before starting a new screening job; existing data will not be overwritten.');else throw e;}
 const ledgerPath=job+'screening-files.json';
 const ledger=await fs.readFile(await localPath(project,ledgerPath),'utf8').then(JSON.parse,e=>{if(e.code==='ENOENT')return {};throw e;});
 const existing=new Array(sources.length);let destinationCursor=0;
 await Promise.all(Array.from({length:Math.min(16,sources.length)},async()=>{
  while(destinationCursor<sources.length){const i=destinationCursor++;await checkAbort();
   existing[i]=await fs.lstat(path.join(target,path.basename(sources[i].source))).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  }
 }));
 let copiedCount=0,reusedCount=0;

 for(let i=0;i<sources.length;i++){
  await checkAbort();const {source,size,mtime,ctime}=sources[i],dest=path.join(target,path.basename(source)),temp=path.join(target,'.screening-'+randomUUID()+'.partial');
  const old=existing[i];
  if(old){
   if(!old.isFile()||old.isSymbolicLink())throw Error('Unsafe existing destination: '+dest);
   const known=ledger[dest],fast=known&&known.source===source&&known.size===size&&known.sourceMtime===mtime&&old.size===size;
   // Compare the source with its saved source snapshot; destination mtime is irrelevant.
   // Without a saved source snapshot, adopt a same-size manually copied file.
   if(!fast&&!(!known&&old.size===size))
    throw Error('Source snapshot has changed or destination size differs; refusing to overwrite: '+dest+'. Move it aside if you want to copy it again. No content hashing is performed.');
   ledger[dest]={source,size,sourceMtime:mtime,destinationMtime:old.mtimeMs,inode:old.ino};reusedCount++;
   if((i+1)%100===0||i===sources.length-1)await progress('Checked '+(i+1)+' / '+sources.length+': '+reusedCount+' already copied');
   continue;
  }
  await progress('Copying '+(i+1)+' / '+sources.length+' to '+folder+': '+path.basename(source));
  try{
   const guard=new Transform({transform(chunk,encoding,callback){checkAbort().then(()=>callback(null,chunk),callback);}});
   await pipeline(createReadStream(source,{highWaterMark:4*1024*1024}),guard,createWriteStream(temp,{flags:'wx'}));
   const after=await fs.stat(source),copied=await fs.stat(temp);
   if(after.size!==size||after.mtimeMs!==mtime||copied.size!==size)throw Error('Source changed during copying: '+source);
   await fs.utimes(temp,after.atime,after.mtime);
   await checkAbort();await fs.link(temp,dest); // Atomic publication, refuses to overwrite.
   const written=await fs.stat(dest);ledger[dest]={source,size,sourceMtime:mtime,destinationMtime:written.mtimeMs,inode:written.ino};copiedCount++;
   await atomic(project,ledgerPath,JSON.stringify(ledger));
  }finally{await fs.rm(temp,{force:true});}
 }
 await checkAbort();
 await atomic(project,ledgerPath,JSON.stringify(ledger));
 const extensions=[...new Set(sources.map(s=>path.extname(s.source)))].sort();
 const gains=await collectScreeningGains(project,roots,manifest.values.collection_path,progress,checkAbort);
 await atomic(project,job+'screening-gains.json',JSON.stringify(gains,null,2));
 // Prune tracked copies and uniquely matched collection copies; keep unrelated data.
 const keep=new Set(sources.map(s=>path.join(target,path.basename(s.source))));
 const removals=[];
 // Also recognize manual copies of deselected images in the current collection.
 // A unique source basename and matching size are required; unrelated files stay.
 const candidates=new Map();
 for(const row of manifest.rows){
  if(!row.source||row.error)continue;
  const dest=path.join(target,path.basename(row.source));
  const list=candidates.get(dest)||[];list.push(row.source);candidates.set(dest,list);
 }
 const extra=[];
 for(const [dest,matches] of candidates){
  if(keep.has(dest)||Object.hasOwn(ledger,dest)||matches.length!==1)continue;
  extra.push({dest,source:matches[0]});
 }
 if(extra.length)await progress('Checking '+extra.length+' deselected collection file(s) for existing local copies…');
 let pruneCursor=0;
 const adopted=await Promise.all(Array.from({length:Math.min(16,extra.length)},async()=>{
  const found=[];
  while(pruneCursor<extra.length){
   const {dest,source}=extra[pruneCursor++];await checkAbort();
   const safe=await localPath(project,path.relative(project,dest));
   const local=await fs.lstat(safe).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
   if(!local)continue;
   if(!local.isFile())throw Error('Unsafe deselected destination: '+dest);
   const original=await readablePath(project,roots,source),st=await fs.stat(original);
   if(!st.isFile()||st.size!==local.size)throw Error('Deselected local file differs in size from its collection source; refusing to delete: '+dest);
   found.push([dest,{source:original,size:st.size,sourceMtime:st.mtimeMs,destinationMtime:local.mtimeMs,inode:local.ino}]);
  }
  return found;
 }));
 for(const records of adopted)for(const [dest,record] of records)ledger[dest]=record;
 for(const [dest,record] of Object.entries(ledger)){
  if(keep.has(dest))continue;
  if(path.dirname(dest)!==target||!record||typeof record.source!=='string'||path.basename(dest)!==path.basename(record.source))throw Error('Unsafe screening copy record: '+dest);
  const safe=await localPath(project,path.relative(project,dest)),st=await fs.lstat(safe).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(st&&(!st.isFile()||st.size!==record.size))throw Error('Deselected destination was replaced or changed; refusing to delete: '+dest);
  removals.push({dest,present:!!st});
 }
 let deleted=0;
 for(const item of removals){
  await checkAbort();
  if(item.present){await fs.unlink(await localPath(project,path.relative(project,item.dest)));deleted++;}
  delete ledger[item.dest];
 }
 await atomic(project,ledgerPath,JSON.stringify(ledger));
 if(deleted)await progress('Deleted '+deleted+' deselected data file(s) from '+folder+'/.');

 await atomic(project,job+'RELION_OUTPUT_NODES.star',`data_output_nodes
loop_
_rlnPipeLineNodeName #1
_rlnPipeLineNodeTypeLabel #2
${folder} Directory
${gains.map(g=>starValue(g.file)+' Image2D.mrc').join('\n')}
`);
 await atomic(project,job+'screening-copy.json',JSON.stringify({folder,count:rows.length,copied:copiedCount,reused:reusedCount,deleted,frames,extensions,extensionCasePreserved:true,gains}));
 await progress('Finished: '+copiedCount+' new file(s) copied, '+reusedCount+' already present, '+deleted+' deselected file(s) deleted in '+folder+'/ ('+frames+' frame'+(frames===1?'':'s')+' per file). '+gains.length+' gain reference(s) prepared. Ready for Import.');
 return {folder,count:rows.length,copied:copiedCount,reused:reusedCount,deleted,frames,extensions,extensionCasePreserved:true,gains};
}

export class ScreeningAdapter{
 constructor(base,project,roots){this.base=base;this.project=project;this.roots=roots;this.kinds=new Map();}
 async isScreening(name){
  const file=path.join(jobPath(this.project,name),'job.star'),st=await fs.stat(file).catch(()=>null);
  if(!st)return false;const stamp=st.mtimeMs+':'+st.size,old=this.kinds.get(name);if(old?.stamp===stamp)return old.yes;
  const yes=/param1_label\s+['"]?screening_config/.test(await fs.readFile(file,'utf8'));this.kinds.set(name,{stamp,yes});return yes;
 }
 async call(args){
  const result=await this.base.call(args);
  if(args[0]==='schema')return [...result,screeningSchema];
  if(['state','refresh'].includes(args[0])){for(const j of result.jobs)if(j.type===99&&await this.isScreening(j.name))j.type=SCREENING;return result;}
  if(args[0]==='job'&&result.type===99&&result.values.param1_label==='screening_config')return {...result,type:SCREENING,values:screeningValues(result.values)};
  return result;
 }
 async submit(action,layout,schema,values,existing,alias,planning={}){
  if(layout.id!==SCREENING)return this.base.submit(action,layout,schema,values,existing,alias,planning);
  if(action==='schedule')throw Error('Screening needs interactive selection. Use Run!, save the selection, and wait for copying to finish before scheduling Import.');

  const v=validateScreening(values),source=await readablePath(this.project,this.roots,v.collection_path);
  if(!(await fs.stat(source)).isDirectory())throw Error('Data collection is not a directory.');
  await localPath(this.project,v.jpg_folder);await localPath(this.project,v.destination_folder);
  if(within(source,path.resolve(this.project,v.jpg_folder)))throw Error('JPEG folder must be outside the source collection.');
  const ext=(await this.base.call(['schema'])).find(s=>s.id===99),wrapper=fileURLToPath(new URL('../scripts/screening-runner.mjs',import.meta.url));
  const payload=Buffer.from(JSON.stringify({values:v,roots:this.roots,continuation:!!existing})).toString('base64url');
  const options={...Object.fromEntries(ext.options.map(f=>[f.key,f.default])),fn_exe:shellQuote(process.execPath)+' '+shellQuote(wrapper),param1_label:'screening_config',param1_value:payload,do_queue:'No',nr_threads:'1',other_args:''};
  const result=await this.base.submit(action,{id:99,label:'relion.external'},ext,options,existing,alias,planning);
  return {...result,browserScreening:action!=='preview'};
 }
}
