import fs from 'node:fs/promises';
import {readablePath} from './paths.mjs';
import {parseStar} from './gallery.mjs';

// Add origin offsets to centered coordinates; keep Angstrom units until the displayed volume's dimensions are known.
export async function attachTomogramParticles(project,roots,manifest,file){
 const actual=await readablePath(project,roots,file);
 if((await fs.stat(actual)).size>256*1024*1024)throw Error('Particle STAR exceeds the 256 MiB overlay limit.');
 const tables=parseStar(await fs.readFile(actual,'utf8')).flatMap(b=>b.tables);
 const axes=['X','Y','Z'];
 const table=tables.find(t=>t.labels.includes('rlnTomoName')&&(axes.every(a=>t.labels.includes('rlnCenteredCoordinate'+a+'Angst'))||axes.every(a=>t.labels.includes('rlnCoordinate'+a))));
 if(!table)throw Error('Particle overlay requires rlnTomoName and complete XYZ coordinates.');
 const centered=axes.every(a=>table.labels.includes('rlnCenteredCoordinate'+a+'Angst')),groups=new Map();
 let invalid=0;
 for(const row of table.rows){
  const xyz=axes.map(a=>{
   const coordinate=Number(row[centered?'rlnCenteredCoordinate'+a+'Angst':'rlnCoordinate'+a]);
   const origin='rlnOrigin'+a+'Angst';
   return centered?coordinate+(table.labels.includes(origin)?Number(row[origin]):0):coordinate;
  });
  if(!xyz.every(Number.isFinite)){invalid++;continue;}
  if(!groups.has(row.rlnTomoName))groups.set(row.rlnTomoName,[]);
  groups.get(row.rlnTomoName).push({xyz,type:row.rlnSupportStructureType,element:row.rlnSupportStructureElement});
 }
 manifest.rows=manifest.rows.map(row=>({...row,tomoPicks:(groups.get(row.rlnTomoName)||[]).map(p=>p.xyz),tomoPickGroups:(groups.get(row.rlnTomoName)||[]).map(p=>({type:p.type,element:p.element})),tomoPickUnits:centered?'angstrom':'unbinned-pixel'}));
 manifest.particlesFile=file;
 manifest.overlayWarning=invalid?invalid+' invalid coordinate rows omitted.':'';
 return manifest;
}
