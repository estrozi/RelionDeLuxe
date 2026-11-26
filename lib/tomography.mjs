import fs from 'node:fs/promises';
import path from 'node:path';
import {parseStar} from './gallery.mjs';
import {readablePath} from './paths.mjs';

// Follow metadata, never load image stacks. Relative references are relative to
// the project working directory, exactly as in RELION's command-line programs.
const links={rlnTomoParticlesFile:'particles',rlnTomoTomogramsFile:'tomograms',rlnTomoTrajectoriesFile:'trajectories',rlnTomoManifoldsFile:'manifolds',rlnTomoTiltSeriesStarFile:'tilts',rlnTomoReferenceMap1File:'file',rlnTomoReferenceMap2File:'file',rlnTomoReferenceMaskFile:'file',rlnTomoReferenceFscFile:'star'};
const useful=v=>typeof v==='string'&&v!==''&&!['None','?','.'].includes(v);
export function tomographyKind(type){
 if(type.startsWith('TomoOptimisationSet'))return 'optimisation';
 if(type.startsWith('TomogramGroupMetadata'))return 'tomograms';
 if(type.startsWith('TomoTrajectoryData'))return 'trajectories';
 if(type.startsWith('ParticleGroupMetadata'))return 'particles';
 return null;
}
export function repeatedTomoIdentifiers(rows){
 const groups=new Map();
 rows.forEach((r,i)=>{const name=r.rlnTomoParticleName;if(!useful(name))return;
  if(!groups.has(name))groups.set(name,[]);groups.get(name).push(i+1);
 });
 const repeated=[...groups].filter(([,indices])=>indices.length>1);
 if(!repeated.length)return null;
 return `${repeated.length} repeated _rlnTomoParticleName identifiers (${repeated.reduce((n,[,r])=>n+r.length-1,0)} extra rows). Different particles may overwrite the same extracted stack and later crash refinement. Examples (particle rows): ${repeated.slice(0,3).map(([name,indices])=>name+' ['+indices.slice(0,4).join(', ')+']').join('; ')}. Distance-based duplicate removal does not renumber identifiers. Keep your selection, regenerate identifiers in a separate extraction-input copy, then run a fresh Extract subtomos job. Do not merely rename an already-extracted output or delete rows by identifier.`;
}
export async function inspectTomography({project,readRoots=[],file,kind,job='',values={},onReference=async()=>{},onIssue=()=>{}}){
 const visited=new Set(),checkedFiles=new Set(),active=new Set(),tomogramNames=new Set(),particleNames=new Set();let count=0;
 async function visit(input,role){
  const key=path.resolve(project,input);
  if(active.has(key)){onIssue(input,'Circular tomography metadata reference.');return;}
  if(visited.has(key))return;
  if(++count>10000){if(count===10001)onIssue(input,'Metadata traversal exceeds 10,000 files; remaining references were not checked.');return;}
  visited.add(key);active.add(key);
  try{
   let actual;try{actual=await readablePath(project,readRoots,input);}catch(e){onIssue(input,'Cannot read referenced metadata: '+e.message);return;}
   if((await fs.stat(actual)).size>64*1024*1024){onIssue(input,'Metadata exceeds the 64 MiB inspection limit; native RELION must validate it.');return;}
   const blocks=parseStar(await fs.readFile(actual,'utf8')),tables=blocks.flatMap(b=>b.tables),rows=tables.flatMap(t=>t.rows),scalar=Object.assign({},...blocks.map(b=>b.values));
   const requireColumns=(table,labels,description)=>{if(!table?.rows.length){onIssue(input,'Missing or empty '+description+' table.');return;}const missing=labels.filter(l=>!table.labels.includes(l));if(missing.length)onIssue(input,description+' is missing '+missing.map(l=>'_'+l).join(', ')+'.');};
   if(role==='optimisation'){
    const metadata={...scalar,...rows[0]};for(const label of ['rlnTomoParticlesFile','rlnTomoTomogramsFile'])if(!useful(metadata[label]))onIssue(input,'Optimisation set is missing _'+label+'.');
   }
   if(role==='tomograms'){
    const table=blocks.find(b=>b.name==='global')?.tables[0];requireColumns(table,['rlnTomoName'],'data_global');
    for(const r of table?.rows||[])if(r.rlnTomoName)tomogramNames.add(r.rlnTomoName);
    if(table&&!table.labels.includes('rlnTomoTiltSeriesStarFile'))onIssue(input,'Legacy embedded tilt tables: RELION may convert this format; modern tilt-series reference checks are unavailable.');
   }
   if(role==='particles'){
    const table=blocks.find(b=>b.name==='particles')?.tables.find(t=>t.labels.includes('rlnTomoName'))||tables.find(t=>t.labels.includes('rlnTomoName'));
    requireColumns(table,['rlnTomoName'],'tomography particles');
    for(const r of table?.rows||[])particleNames.add(r.rlnTomoName);
    const labels=table?.labels||[];
    if(['Subset selection','Extract subtomos','3D classification','3D auto-refine','3D initial reference','Reconstruct particle'].includes(job)){const warning=repeatedTomoIdentifiers(table?.rows||[]);if(warning)onIssue(input,warning);}
    if(table&&!['rlnCenteredCoordinateXAngst','rlnCenteredCoordinateYAngst','rlnCenteredCoordinateZAngst'].every(l=>labels.includes(l))&&!['rlnCoordinateX','rlnCoordinateY','rlnCoordinateZ'].every(l=>labels.includes(l)))onIssue(input,'Particles need complete centered XYZ coordinates in Å or legacy XYZ pixel coordinates. No coordinate conversion was performed.');
    if(['3D classification','3D auto-refine','3D initial reference'].includes(job)&&!labels.includes('rlnImageName'))onIssue(input,'Refinement requires extracted particle images (_rlnImageName). Run Extract subtomos first.');
   }
   if(role==='tilts'){
    const table=tables.find(t=>t.labels.some(l=>['rlnMicrographMovieName','rlnMicrographName'].includes(l)));
    requireColumns(table,[job==='Motion correction'?'rlnMicrographMovieName':'rlnMicrographName'],'tilt images');
    if(job==='CTF estimation'&&values.use_given_ps==='Yes')requireColumns(table,['rlnCtfPowerSpectrum'],'tilt images');
   }
   if(!tables.length&&!Object.keys(scalar).length)onIssue(input,'No STAR metadata found.');
   // Existence only: no image byte reads, hashes, or frame decoding.
   const imageLabels=role==='particles'?['rlnImageName']:role==='tilts'?(job==='Motion correction'?['rlnMicrographMovieName']:['rlnMicrographName',...(job==='CTF estimation'&&values.use_given_ps==='Yes'?['rlnCtfPowerSpectrum']:[])]):[];
   for(const row of rows)for(const label of imageLabels)if(useful(row[label])){const target=row[label].replace(/^\d+@/,'');if(!checkedFiles.has(target)){checkedFiles.add(target);await onReference(target,input);}}
   for(const row of [scalar,...rows])for(const [label,role]of Object.entries(links))if(useful(row[label])){
    const target=row[label];const present=await onReference(target,input);
    if(present!==false&&role!=='file')await visit(target,role);
   }
  }catch(e){onIssue(input,'Cannot inspect tomography metadata: '+e.message);}
  finally{active.delete(key);}
 }
 await visit(file,kind);
 if(tomogramNames.size)for(const name of particleNames)if(name&&!tomogramNames.has(name))onIssue(file,'Particle references unknown tomogram '+name+'.');
 return {files:visited.size,tomograms:tomogramNames.size};
}
