import {polishingMicrographs} from './polishing-inputs.mjs';
import {inputReadiness} from './input-readiness.mjs';
// RELION's native chooser selects .Nodes/<type prefix at node_type_depth>.
// Those files are markers, not the STAR data themselves. Never read them as data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {readablePath} from './paths.mjs';
export function inputField(catalog,type,key){
 const field=catalog.find(x=>x.id===Number(type))?.options.find(x=>x.key===key);
 if(!field||![2,3].includes(field.type))throw new Error('Unknown input file field');
 return Number(type)===57&&key==='in_tiltseries'?{...field,tiltSeriesOnly:true}:field;
}
export function modelAngeloMap(project,state,file){
 if(typeof file!=='string'||!file.trim())return false;
 let canonical=path.isAbsolute(file)?path.relative(project,file):file;
 canonical=path.posix.normalize(canonical).replace(/^\.\//,'');
 for(const job of state.jobs||[])if(job.alias&&job.alias!=='None'&&canonical.startsWith(job.alias))canonical=job.name+canonical.slice(job.alias.length);
 return /(?:^|\/)postprocess_masked\.mrc$/i.test(canonical)&&(state.jobs||[]).some(job=>Number(job.type)===15&&(job.outputs||[]).includes(canonical));
}
// Reconstruct particle (STA type 54) produces maps, not an optimisation set.
// Ignore stale/native placeholder nodes even when .Nodes advertises them.
export function validInputProducer(field,job){
 if(field.tiltSeriesOnly&&![50,1,2,55,57].includes(Number(job?.type)))return false;
 // CTF outputs share a broad metadata node group with their inputs in both modes.
 if(field.key==='input_star_mics'&&Number(job?.type)===2)return false;
 return !(Number(job?.type)===54&&(field.key==='in_optimisation'||field.nodeType?.startsWith('TomoOptimisationSet')));
}
export function nodeGroup(field){
 if(field.type!==3||!Number.isInteger(field.nodeDepth)||field.nodeDepth<1)throw new Error('Rebuild the native adapter to enable compatible input browsing.');
 if(!/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/.test(field.nodeType))throw new Error('Unsupported input type');
 return field.nodeType.split('.').slice(0,field.nodeDepth).join('.');
}
// FLTK patterns consist of labels with parenthesized globs, tab-separated
// alternatives and brace extension lists. No regular expressions supplied by users.
export function matchesPattern(name,pattern){
 const groups=[...(pattern||'').matchAll(/\(([^()]*)\)/g)].map(m=>m[1]);
 const patterns=groups.length?groups:[pattern||'*'];
 function expand(s){const m=s.match(/\{([^{}]+)\}/);return m?m[1].split(',').flatMap(x=>expand(s.slice(0,m.index)+x+s.slice(m.index+m[0].length))):[s];}
 return patterns.flatMap(expand).some(glob=>{
  if(['*','*.*','','undefined'].includes(glob.trim()))return true;
  const re=glob.trim().split('').map(c=>c==='*'?'.*':c==='?'?'.':'\\^$+?.()|{}[]'.includes(c)?'\\'+c:c).join('');
  return new RegExp('^'+re+'$').test(name);
 });
}
// Extraction still accepts Import's legacy coordinate-suffix descriptors.
// The native chooser's *.star pattern accidentally hides descriptors such as
// coords_suffix.box. Only widen this exact field, retaining registered node types.
export function matchesInputFile(name,field){
 if(field.tiltSeriesOnly&&!/(?:^|_)tilt_series(?:_[^/]*)?\.star$/i.test(name))return false;
 const legacy=field.key==='coords_suffix'&&field.type===3&&field.nodeType?.split('.')[0]==='MicrographCoordsGroup'&&/^coords_suffix.+$/.test(name);
 return legacy||matchesPattern(name,field.pattern);
}
function canonicalName(name,state){
 for(const job of state.jobs)if(job.alias&&job.alias!=='None'&&name.startsWith(job.alias))return job.name+name.slice(job.alias.length);
 return name;
}
async function allowedMissingPath(project,readRoots,name){
 let candidate=path.resolve(project,name);
 while(true){
  const st=await fs.lstat(candidate).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(st){try{await readablePath(project,readRoots,candidate);return true;}catch{return false;}}
  const parent=path.dirname(candidate);if(parent===candidate)return false;candidate=parent;
 }
}
export async function compatibleInputs(project,readRoots,field,state,{query='',limit=1000}={}){
 const group=nodeGroup(field),root=path.join(project,'.Nodes',group);
 const entries=[],seen=new Set(),nodes=new Map(state.nodes.map(n=>[n.name,n]));
 let visited=0,truncated=false;
 // Marker trees created by RELION contain ordinary directories and empty files.
 // Do not follow substituted links anywhere inside this private index.
 for(const dir of [path.join(project,'.Nodes'),root]){
  const st=await fs.lstat(dir).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  if(!st)return {entries,truncated:false};
  if(!st.isDirectory()||st.isSymbolicLink())throw new Error('The project input index is not a regular directory.');
 }
 async function visit(relative='',depth=0){
  if(depth>32){truncated=true;return;}
  const dir=await fs.opendir(path.join(root,relative));
  for await(const item of dir){
   if(++visited>50000){truncated=true;break;}
   if(item.name.startsWith('.')||item.isSymbolicLink())continue;
   const rel=path.posix.join(relative,item.name);
   if(item.isDirectory()){await visit(rel,depth+1);continue;}
   if(!item.isFile()||!matchesInputFile(item.name,field))continue;
   const canonical=canonicalName(rel,state),node=nodes.get(canonical);
   if(!node||node.type.split('.').slice(0,field.nodeDepth).join('.')!==group||seen.has(canonical))continue;
   const job=state.jobs.find(j=>j.outputs.includes(canonical))||state.jobs.find(j=>canonical.startsWith(j.name));
   if(!validInputProducer(field,job)||(field.modelAngeloMapOnly&&!modelAngeloMap(project,state,canonical)))continue;
   const label=job?.alias&&job.alias!=='None'?job.alias:job?.name||'';
   if(!`${canonical} ${label}`.toLowerCase().includes(query.toLowerCase()))continue;
   let available=false,reason='';
   try{const target=await readablePath(project,readRoots,canonical);if(!(await fs.stat(target)).isFile())continue;const readiness=await inputReadiness(project,readRoots,canonical);available=readiness.available;reason=readiness.reason||'';}
   catch(e){if(e.code!=='ENOENT'&&e.code!=='ENOTDIR')continue;}
   if(!available&&(!['Scheduled','Running'].includes(job?.status)||!await allowedMissingPath(project,readRoots,canonical)))continue;
   if(field.requireMicrographMetadata&&!await polishingMicrographs(project,readRoots,canonical))continue;
   seen.add(canonical);
   entries.push({name:path.posix.basename(canonical),path:canonical,directory:false,job:job?.name||'',alias:label,status:job?.status||'',available,reason});
  }
 }
 await visit();
 entries.sort((a,b)=>Number(b.available)-Number(a.available)||a.path.localeCompare(b.path,undefined,{numeric:true}));
 return {entries:entries.slice(0,limit),truncated:truncated||entries.length>limit};
}
export async function filesystemInputs(project,readRoots,relative,field){
 const real=await readablePath(project,readRoots,relative),entries=[];let truncated=false;
 const dir=await fs.opendir(real);
 for await(const item of dir){
  if(item.name.startsWith('.'))continue;
  const logical=path.join(relative,item.name);
  try{
   const target=await readablePath(project,readRoots,logical),stat=await fs.stat(target);
   if(!stat.isDirectory()&&(!stat.isFile()||!matchesInputFile(item.name,field)))continue;
   entries.push({name:item.name,path:logical,directory:stat.isDirectory()});
   if(entries.length>=1000){truncated=true;break;}
  }catch{}
 }
 return {entries:entries.sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name)),truncated};
}
// Continuation checkpoints are not all registered as output nodes: include
// only the latest ready optimiser inside each pipeline job of the requested type.
export async function continuationInputs(project,readRoots,field,state,type,{query='',limit=1000,job:requestedJob=null,iterationsOnly=false}={}){
 const entries=[];let visited=0,truncated=false;
 for(const job of state.jobs.filter(j=>j.type===type&&(requestedJob===null||j.name===requestedJob))){
  if(!/^[A-Za-z][A-Za-z0-9]*\/job\d+\/$/.test(job.name))continue;
  const label=job.alias&&job.alias!=='None'?job.alias:job.name;
  async function visit(relative,depth=0){
   if(depth>20||visited>=50000){truncated=true;return;}
   let dir;
   try{const real=await readablePath(project,readRoots,relative);const st=await fs.lstat(path.resolve(project,relative));if(st.isSymbolicLink()||!st.isDirectory())return;dir=await fs.opendir(real);}
   catch(e){if(['ENOENT','ENOTDIR','EACCES'].includes(e.code))return;throw e;}
   for await(const item of dir){
    if(++visited>50000){truncated=true;break;}
    if(item.name.startsWith('.')||item.isSymbolicLink())continue;
    const file=path.posix.join(relative,item.name);
    if(item.isDirectory()){await visit(file,depth+1);continue;}
    if(!item.isFile()||!matchesPattern(item.name,field.pattern)||(iterationsOnly&&!/^run_it\d+_optimiser\.star$/.test(item.name)))continue;
    const readiness=await inputReadiness(project,readRoots,file);
    entries.push({name:item.name,path:file,directory:false,job:job.name,alias:label,status:job.status,...readiness});
   }
  }
  await visit(job.name);
 }
 const latest=new Map(),other=[];
 for(const entry of entries){
  if(!/_optimis?er\.star$/i.test(entry.name)){other.push(entry);continue;}
  if(!entry.available)continue;
  const iteration=Number(entry.name.match(/_it(\d+)_/)?.[1]??Infinity);
  const previous=latest.get(entry.job);
  if(!previous||iteration>previous.iteration||(iteration===previous.iteration&&entry.path.localeCompare(previous.entry.path)>0))latest.set(entry.job,{entry,iteration});
 }
 const chosen=[...other,...[...latest.values()].map(v=>v.entry)]
  .filter(e=>`${e.path} ${e.alias}`.toLowerCase().includes(query.toLowerCase()))
  .sort((a,b)=>a.path.localeCompare(b.path,undefined,{numeric:true}));
 return {entries:chosen.slice(0,limit),truncated:truncated||chosen.length>limit};
}

// An explicit Subset-selection escape hatch; never extends external read roots.
export async function exoticStarInputs(project,layoutName,field,relative='.'){
 if(layoutName!=='Subset selection'||!['fn_mic','fn_data'].includes(field.key))throw Error('Exotic STAR browsing is only available for Subset selection micrograph/particle inputs.');
 return filesystemInputs(project,[],relative,{...field,type:2,nodeType:'',pattern:'STAR files (*.star)'});
}
