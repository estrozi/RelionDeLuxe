import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {readablePath} from './paths.mjs';
export const MASK_RESCALE=1003;
const marker='reliondeluxe_mask_rescale';
const field=(key,label,nodeType,help)=>({key,label,default:'',help,type:3,nodeType,nodeDepth:1,pattern:'Image Files (*.mrc)',choices:[]});
export const maskRescaleSchema={id:MASK_RESCALE,options:[field('map','Reference 3D map:','DensityMap.mrc','The map whose pixel size and grid the output mask must match.'),field('mask','Input mask:','Mask3D.mrc','The original mask to resize. It will not be modified.')]};
export const maskRescaleLayout={id:MASK_RESCALE,label:'relion.external.maskrescale',name:'Mask re-scaling',custom:true,directory:'External',tabs:{'I/O':['map','mask']},fields:{},overrides:{}};
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
export class MaskRescaleAdapter{
 constructor(base,project,roots){this.base=base;this.env=base.env;this.project=project;this.roots=roots;}
 async call(args){const result=await this.base.call(args);
  if(args[0]==='schema')return [...result,maskRescaleSchema];
  if(args[0]==='job'&&result.type===99&&result.values.param1_label===marker)return {...result,type:MASK_RESCALE,values:{map:result.values.in_3dref,mask:result.values.in_mask}};
  if(['state','refresh'].includes(args[0]))for(const job of result.jobs)if(job.type===99)try{const data=await this.base.call(['job',job.name]);if(data.values.param1_label===marker)job.type=MASK_RESCALE;}catch{}
  return result;
 }
 async submit(action,layout,schema,values,existing,alias,planning={}){
  if(layout.id!==MASK_RESCALE)return this.base.submit(action,layout,schema,values,existing,alias,planning);
  if(!values.map||!values.mask)throw Error('Provide both the reference 3D map and the mask to resize.');
  if(existing){const job=await this.base.call(['job',existing]);if(job.type!==99||job.values.param1_label!==marker)throw Error('The existing job is not a Mask re-scaling External job.');}
  // The native External job owns both input nodes and the process lifecycle.
  const ext=(await this.base.call(['schema'])).find(s=>s.id===99);
  const runner=fileURLToPath(new URL('../scripts/mask-rescale-runner.mjs',import.meta.url));
  const result=await this.base.submit(action,{id:99,label:'relion.external'},ext,{fn_exe:quote(process.execPath)+' '+quote(runner),in_3dref:values.map,in_mask:values.mask,param1_label:marker,param1_value:'Yes',param2_label:'read_roots',param2_value:Buffer.from(JSON.stringify(this.roots)).toString('base64url'),nr_threads:'1',do_queue:'No',other_args:''},existing,alias,planning);
  if(result.inputs)result.inputs=[{name:values.map,type:'DensityMap.mrc'},{name:values.mask,type:'Mask3D.mrc'}];
  return result;
 }
}
export async function mrcGrid(project,roots,file){
 const target=await readablePath(project,roots,file),handle=await fs.open(target,'r');
 try{
  const header=Buffer.alloc(1024),{bytesRead}=await handle.read(header,0,1024,0);if(bytesRead<1024)throw Error('Incomplete MRC header: '+file);
  const big=header[212]===17&&header[213]===17;
  const read=(little)=>{const i=o=>little?header.readInt32LE(o):header.readInt32BE(o),f=o=>little?header.readFloatLE(o):header.readFloatBE(o);return {size:[0,4,8].map(i),sampling:[28,32,36].map(i),cell:[40,44,48].map(f)};};
  const valid=v=>v.size.every(n=>n>0&&n<1000000)&&v.sampling.every(n=>n>0&&n<1000000)&&v.cell.every(n=>Number.isFinite(n)&&n>0);
  const grid=read(!big);if(!valid(grid))throw Error('Invalid MRC grid or pixel size: '+file);
  const pixels=grid.cell.map((n,i)=>n/grid.sampling[i]);
  if(pixels.some(n=>Math.abs(n-pixels[0])>Math.max(0.0001,pixels[0]*0.0001)))throw Error('Anisotropic MRC pixel sizes are not supported: '+file);
  return {size:grid.size,pixelSize:pixels[0]};
 }finally{await handle.close();}
}
export function matchingGrid(reference,mask){return reference.size.every((n,i)=>n===mask.size[i])&&Math.abs(reference.pixelSize-mask.pixelSize)<=Math.max(0.0001,reference.pixelSize*0.0001);}
