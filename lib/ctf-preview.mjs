import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {parseStar,galleryImage} from './gallery.mjs';
import {readablePath} from './paths.mjs';
import {resolveExecutable} from './executables.mjs';
import {starValue} from './settings.mjs';
const exec=promisify(execFile);
// The input optics pixel size is not necessarily the scale of the diagnostic:
// CTFFIND may resample before fitting. Its log reports the resulting scale.
export function ctfDiagnosticMetadata(log='',script=''){
 const positive=value=>Number.isFinite(Number(value))&&Number(value)>0?Number(value):null;
 const matches=[...log.matchAll(/Pixel size for fitting\s*:\s*([\d.eE+-]+)/gi)];
 const fittingAngpix=positive(matches.at(-1)?.[1]);
 // RELION's CTFFIND4 here-document: input, output, pixel, kV, Cs, AC, box, min, max.
 const body=script.match(/<<\s*['"]?EOF['"]?\s*\r?\n([\s\S]*?)\r?\nEOF\b/)?.[1]?.split(/\r?\n/).map(s=>s.trim());
 return {fittingAngpix,inputAngpix:positive(body?.[2]),actualResmin:positive(body?.[7]),actualResmax:positive(body?.[8])};
}
export const ctfPreviewKeys=['input_star_mics','box','resmin','resmax','dfmin','dfmax','dfstep','dast','do_phaseshift','phase_min','phase_max','phase_step','fn_ctffind_exe','ctf_win','slow_search','use_given_ps','use_noDW','localsearch_nominal_defocus','exp_factor_dose','other_args'];
export function ctfPreviewArgs(v,tomo=false,ctffind='./ctffind'){
 if(String(v.other_args||'').trim())throw Error('CTF preview cannot safely apply Additional arguments. Clear them before previewing.');
 const args=['--i','input.star','--o','output/','--ctffind_exe',ctffind,'--is_ctffind4'];
 const fields=[['box','Box',512],['resmin','ResMin',30],['resmax','ResMax',5],['dfmin','dFMin',5000],['dfmax','dFMax',50000],['dfstep','FStep',500],['dast','dAst',100],['ctf_win','ctfWin',-1]];
 if(tomo)fields.push(['localsearch_nominal_defocus','localsearch_nominal_defocus',10000],['exp_factor_dose','exp_factor_dose',100]);
 if(v.do_phaseshift==='Yes'){args.push('--do_phaseshift');fields.push(['phase_min','phase_min',0],['phase_max','phase_max',180],['phase_step','phase_step',10]);}
 for(const [key,flag,fallback] of fields){const raw=key==='box'&&v.use_given_ps==='Yes'?512:v[key]??fallback,n=Number(raw);if(String(raw).trim()===''||!Number.isFinite(n))throw Error('Invalid '+key);args.push('--'+flag,String(n));}
 if(v.slow_search!=='Yes')args.push('--fast_search');
 if(v.use_given_ps==='Yes')args.push('--use_given_ps');
 if(!tomo&&v.use_noDW==='Yes')args.push('--use_noDW');
 if(Number(v.box??512)<=0||Number(v.dfstep??500)<=0||Number(v.resmin??30)<=0||Number(v.resmax??5)<=0||Number(v.dfmin??5000)>Number(v.dfmax??50000))throw Error('Check the FFT box, resolution and defocus search settings.');
 return args;
}
const serialize=blocks=>blocks.map(b=>'data_'+b.name+'\n'+Object.entries(b.values).map(([k,v])=>'_'+k+' '+starValue(v)+'\n').join('')+b.tables.map(t=>'\nloop_\n'+t.labels.map(k=>'_'+k).join('\n')+'\n'+t.rows.map(r=>t.labels.map(k=>starValue(r[k])).join(' ')).join('\n')+'\n').join('')).join('\n');
const previewAngpix=(blocks,mic)=>{
 const direct=Number(mic.rlnMicrographPixelSize||mic.rlnImagePixelSize||mic.rlnTomoTiltSeriesPixelSize);
 if(direct>0)return direct;
 const optics=blocks.flatMap(block=>block.tables).find(table=>table.labels.includes('rlnOpticsGroup')&&table.labels.some(label=>['rlnMicrographPixelSize','rlnImagePixelSize','rlnTomoTiltSeriesPixelSize'].includes(label)));
 const row=optics?.rows.find(candidate=>candidate.rlnOpticsGroup===mic.rlnOpticsGroup);
 const pixel=Number(row?.rlnMicrographPixelSize||row?.rlnImagePixelSize||row?.rlnTomoTiltSeriesPixelSize);
 return pixel>0?pixel:null;
};
export async function prepareCtfPreview(project,roots,v,seed,dir,excludeMicrograph=null){
 if(typeof seed!=='string'||!seed||seed.length>100)throw Error('Invalid preview identity');
 if(excludeMicrograph!==null&&(typeof excludeMicrograph!=='string'||excludeMicrograph.length>16384))throw Error('Invalid previous preview image');
 const read=async file=>parseStar(await fs.readFile(await readablePath(project,roots,file),'utf8'));
 const blocks=await read(v.input_star_mics),global=blocks.flatMap(b=>b.tables).find(t=>t.labels.includes('rlnTomoTiltSeriesStarFile'));
 const candidates=[];
 if(global){for(const row of global.rows){const data=await read(row.rlnTomoTiltSeriesStarFile);for(const table of data.flatMap(b=>b.tables).filter(t=>t.labels.includes('rlnMicrographName')))for(const mic of table.rows)candidates.push({row,mic,data,table});}}
 else for(const table of blocks.flatMap(b=>b.tables).filter(t=>t.labels.includes('rlnMicrographName')))for(const mic of table.rows)candidates.push({mic,data:blocks,table});
 if(!candidates.length)throw Error('No input micrographs found. Choose an existing input STAR file in I/O.');
 const alternatives=candidates.filter(c=>c.mic.rlnMicrographName!==excludeMicrograph);
 const pool=alternatives.length?alternatives:candidates;
 const index=createHash('sha256').update(seed).digest().readUInt32LE(0)%pool.length;
 const chosen=pool[index],micrograph=chosen.mic.rlnMicrographName;
 const preExposure=Number(chosen.mic.rlnMicrographPreExposure);
 let angpix=previewAngpix([...blocks,...chosen.data],chosen.mic);
 if(!(angpix>0)&&global){const pixel=Number(chosen.row.rlnTomoTiltSeriesPixelSize);if(pixel>0)angpix=pixel;}
 chosen.table.rows=[chosen.mic];
 for(const key of ['rlnMicrographName',...(v.use_noDW==='Yes'&&!global?['rlnMicrographNameNoDW']:[]),...(v.use_given_ps==='Yes'?['rlnCtfPowerSpectrum']:[])]){
  const value=chosen.mic[key];if(!value)throw Error('Selected micrograph has no '+key+' column.');
  const file=await readablePath(project,roots,value.replace(/:mrcs?$/i,''));
  const local=key+path.extname(file).replace(/[^a-zA-Z0-9.]/g,'');
  await fs.symlink(file,path.join(dir,local));chosen.mic[key]=local;
 }
 if(global){global.rows=[chosen.row];chosen.row.rlnTomoName='preview';chosen.data.find(b=>b.tables.includes(chosen.table)).name='preview';chosen.row.rlnTomoTiltSeriesStarFile='series.star';await fs.writeFile(path.join(dir,'series.star'),serialize(chosen.data));}
 await fs.writeFile(path.join(dir,'input.star'),serialize(blocks));
 return {micrograph,tomo:!!global,angpix,preExposure:Number.isFinite(preExposure)?preExposure:null};
}
export async function ctfPreview(project,roots,b,{resolve=resolveExecutable,execute=exec,debug=false}={}){
 const v=b.values||{};ctfPreviewArgs(v); // Reject unsupported arguments before reading input.
 const runner=await resolve('relion_run_ctffind',{cwd:project}),ctffind=await resolve(v.fn_ctffind_exe||'ctffind',{cwd:project});
 if(!runner||!ctffind)throw Error('CTF preview requires relion_run_ctffind and the configured CTFFIND executable.');
 const base=path.join(project,'.reliondeluxe');await fs.mkdir(base,{recursive:true});await readablePath(project,[],base);
 const dir=await fs.mkdtemp(path.join(base,'ctf-preview-'));
 try{
  const chosen=await prepareCtfPreview(project,roots,v,b.seed,dir,b.excludeMicrograph??null);await fs.mkdir(path.join(dir,'output'));
  if(debug){
   const input=await fs.readFile(path.join(dir,'input.star'),'utf8');
   console.log('[debug] CTF preview generated input.star:\n'+input);
   if(chosen.tomo)console.log('[debug] CTF preview generated series.star:\n'+await fs.readFile(path.join(dir,'series.star'),'utf8'));
  }
  // No MPI, queue, pipeline control, or original output paths in this test.
  const nyquist=chosen.angpix>0?2*chosen.angpix:null;
  const effectiveResmax=nyquist!==null?Math.max(Number(v.resmax??5),Math.ceil(nyquist*2)/2):Number(v.resmax??5);
  const effective={...v,resmax:String(effectiveResmax)};
  const doseFactor=Number(v.exp_factor_dose??100);
  let actualResmax=chosen.tomo&&doseFactor>0&&chosen.preExposure!==null?Math.min(effectiveResmax*Math.exp(chosen.preExposure/doseFactor),Number(v.resmin??30)*.9):effectiveResmax;
  const previewArgs=ctfPreviewArgs(effective,chosen.tomo,ctffind);
  if(debug)console.log('[debug] CTF preview '+JSON.stringify({runner,args:previewArgs,ctffind,micrograph:chosen.micrograph,angpix:chosen.angpix,nyquist,requestedResmax:Number(v.resmax??5),box:v.use_given_ps==='Yes'?512:Number(v.box??512),resmin:Number(v.resmin??30),resmax:effectiveResmax,preExposure:chosen.preExposure,doseFactor,actualResmax}));
  try{await execute(runner,previewArgs,{cwd:dir,timeout:10*60*1000,maxBuffer:4*1024*1024});}catch(error){if(debug)console.log('[debug] CTF preview failure '+JSON.stringify({stdout:error.stdout,stderr:error.stderr}));throw error;}
  const find=async folder=>{for(const e of await fs.readdir(folder,{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory()){const result=await find(p);if(result)return result;}else if(e.isFile()&&e.name.endsWith('.ctf'))return p;}return null;};
  const diagnostic=await find(path.join(dir,'output'));if(!diagnostic)throw Error('CTFFIND produced no diagnostic image. Check the executable and search settings.');
  const stem=diagnostic.replace(/\.ctf$/,'');
  const readOptional=async file=>fs.readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;});
  const [log,script]=await Promise.all([readOptional(stem+'_ctffind4.log'),readOptional(stem+'_ctffind4.com')]);
  const reported=ctfDiagnosticMetadata(log,script),fittingAngpix=reported.fittingAngpix??chosen.angpix;
  actualResmax=reported.actualResmax??actualResmax;
  const resmin=Number(v.resmin??30),actualResmin=reported.actualResmin??resmin;
  const scaleSource=reported.fittingAngpix?'CTFFIND log':'input STAR (fallback)';
  const box=v.use_given_ps==='Yes'?512:Number(v.box??512),image=await galleryImage(project,roots,diagnostic,box);
  if(debug)console.log('[debug] CTF preview diagnostic '+JSON.stringify({file:diagnostic,inputAngpix:chosen.angpix,fittingAngpix,scaleSource,resmin,actualResmin,resmax:effectiveResmax,actualResmax,sourceWidth:image.nx,sourceHeight:image.ny,displayWidth:image.output.readUInt32LE(0),displayHeight:image.output.readUInt32LE(4)}));
  return {...chosen,image:image.output.toString('base64'),imageWidth:image.nx,imageHeight:image.ny,box,resmin,actualResmin,resmax:effectiveResmax,actualResmax,fittingAngpix,scaleSource,doseFactor};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
