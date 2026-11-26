import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {settingsStar} from './settings.mjs';
import {resolveExecutable} from './executables.mjs';
export const HELICAL=1001;
const field=(key,label,value,help,type=6)=>({key,label,default:value,help,type,nodeType:'',nodeDepth:1,pattern:'',choices:[]});
export const helicalSchema={id:HELICAL,options:[
 {...field('fn_img','Input images STAR file:','','A registered STAR file containing 2D class averages (rlnImageName or rlnReferenceImage).',3),nodeType:'Image2DGroupMetadata.star.relion',pattern:'STAR files (*.star)'},
 field('angpix','Pixel size (A):','1.276','Pixel size in Angstroms.'),
 field('mask_diameter','Mask diameter (A):','190','Diameter of the mask in Angstroms.'),
 field('nr_threads','Number of threads:','12','Number of CPU threads.'),
 field('crossover_distance','Crossover_distance (A):','11.5','Distance in Angstroms between 2 cross-overs. The crossover distance is half the helical pitch.'),
 field('other_args','Additional arguments:','','Additional command-line arguments for relion_helix_inimodel2d, appended after the standard arguments. Use single quotes around values containing spaces.',0)
]};
export const helicalLayout={id:HELICAL,label:'relion.external.initialmodelhelical',name:'3D initial helical reference',custom:true,directory:'InitialModelHelical',tabs:{'I/O':['fn_img','angpix','mask_diameter','crossover_distance'],'Running':['nr_threads','other_args']},fields:{},overrides:{}};
export function addHelicalLayout(layout){const copy=[...layout];copy.splice(copy.findIndex(x=>x.name==='3D initial reference')+1,0,helicalLayout);return copy;}
const shellQuote=s=>"'"+s.replaceAll("'","'\\''")+"'";
const isHelical=j=>j.type===99&&/^InitialModelHelical\/job\d+\/$/.test(j.name);
export function helicalValues(v){return {fn_img:v.in_part,angpix:v.param1_value,mask_diameter:v.param2_value,crossover_distance:v.param3_value,nr_threads:v.nr_threads,other_args:(v.other_args||'').replace(/^-- /,'')};}
export function validateHelical(values){
 const v={...Object.fromEntries(helicalSchema.options.map(f=>[f.key,f.default])),...values};
 if(typeof v.other_args!=='string'||v.other_args.includes('"'))throw new Error('Additional arguments: use single quotes instead of double quotes so RELION can save and reopen these settings.');
 if(!/^[A-Za-z0-9_./-]+\.star$/.test(v.fn_img)||v.fn_img.split('/').includes('..'))throw new Error('Choose an input STAR path using letters, numbers, dots, underscores, hyphens and slashes.');
 for(const key of ['angpix','mask_diameter','crossover_distance','nr_threads'])if(!Number.isFinite(Number(v[key]))||Number(v[key])<=0)throw new Error(key+' must be positive.');
 if(!Number.isInteger(Number(v.nr_threads)))throw new Error('Number of threads must be an integer.');
 return v;
}
export class HelicalAdapter {
 constructor(base){this.base=base;}
 async call(args){
  const result=await this.base.call(args);
  if(args[0]==='schema')return [...result,helicalSchema];
  if(['state','refresh'].includes(args[0]))return {...result,jobs:result.jobs.map(j=>isHelical(j)?{...j,type:HELICAL}:j)};
  if(args[0]==='job'&&result.type===99&&/^InitialModelHelical\/job\d+\/$/.test(args[1]))return {type:HELICAL,values:helicalValues(result.values)};
  return result;
 }
 async submit(action,layout,schema,values,existing,alias,planning={}){
  if(layout.id!==HELICAL)return this.base.submit(action,layout,schema,values,existing,alias,planning);
  const v=validateHelical(values),base=this.base;
  const state=await base.call(['state']);
  const input=[...state.nodes,...(action==='preview'?(planning.anticipatedInputs||[]):[])].find(n=>n.name===v.fn_img);
  if(!input||!input.type.startsWith('Image2DGroupMetadata.'))throw new Error('Select a registered 2D class-average STAR file. Import external class averages into the project first.');
  const ext=(await base.call(['schema'])).find(s=>s.id===99);
  const wrapper=fileURLToPath(new URL('../scripts/helical-runner.mjs',import.meta.url));
  const options={fn_exe:shellQuote(process.execPath)+' '+shellQuote(wrapper),in_part:v.fn_img,nr_threads:v.nr_threads,do_queue:'No',other_args:v.other_args?'-- '+v.other_args:'',
   param1_label:'angpix',param1_value:v.angpix,param2_label:'mask_diameter',param2_value:v.mask_diameter,param3_label:'crossover_distance',param3_value:v.crossover_distance};
  const dir=path.join(base.project,'.reliondeluxe');await fs.mkdir(dir,{recursive:true,mode:0o700});
  const file=path.join(dir,randomUUID()+'.star');await fs.writeFile(file,settingsStar({label:'relion.external'},ext,options),{mode:0o600,flag:'wx'});
  try{
   const preview=await base.call(['helical-preview',file,existing||'']);
   if(v.other_args){preview.command+=' '+v.other_args;preview.commands=preview.commands.map(c=>c+' '+v.other_args);}
   const executable=await resolveExecutable('relion_helix_inimodel2d',{cwd:base.project,env:base.env});
   if(action==='preview')return {...preview,jobName:existing||preview.command.match(/InitialModelHelical\/job\d+\//)?.[0],inputs:[{name:v.fn_img,type:'Image2DGroupMetadata.star.relion'}],checks:[{name:'relion_helix_inimodel2d',path:executable,required:true}],missing:executable?[]:['relion_helix_inimodel2d']};
   if(action!=='schedule'&&!executable)throw new Error('Executable not found in server PATH: relion_helix_inimodel2d');
   if(action==='continue'&&!existing)throw new Error('Select an existing helical job to rerun.');
   const result=await base.call(['helical-submit',file,existing||'',action,alias||'']);
   return result;
  }finally{await fs.unlink(file);}
 }
}
