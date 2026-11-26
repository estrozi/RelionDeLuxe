const keys=new Set(['cryocare_path','fn_resmap','do_queue','queuename','qsub','qsubscript','min_dedicated','nr_threads','nr_mpi','use_gpu','gpu_ids','gpu_id','scratch_dir','nr_pool','do_parallel_discio','do_preread_images','do_combine_thru_disc','do_preload']);
export const isMachineOption=key=>keys.has(key)||key.startsWith('qsub_extra')||key.endsWith('_exe');
export function portableResources(values,schema){for(const f of schema.options)if(isMachineOption(f.key))values[f.key]='TBD';return values;}
export function resolveResources(layout,schema,values,global){
 const defaults=Object.fromEntries(schema.options.map(f=>[f.key,f.default])),v={...defaults,...layout.overrides,...values};
 for(const key of Object.keys(v))if(isMachineOption(key))v[key]=global[key]??defaults[key];
 const integer=(key)=>{const n=Number(global[key]??'1');if(!Number.isSafeInteger(n)||n<1)throw Error(key+' must be a positive integer in Workstation / cluster defaults');return n;};
 const cpus=integer('globalNcpus'),gpus=integer('globalNgpus'),ids=String(global.gpu_ids??global.globalGpu_ids??'').trim();
 const set=(key,value)=>{if(Object.hasOwn(defaults,key))v[key]=String(value);};
 const gpu=()=>{if(ids==='')return '';if(!/^\d+(?:[:,]\d+)*$/.test(ids))throw Error('gpu_ids must list GPU numbers separated by commas or colons');if(new Set(ids.split(/[:,]/)).size!==gpus)throw Error('globalNgpus must match the number of distinct GPUs in gpu_ids');return ids;};
 if(layout.mode==='tomo'){
  // Native tomo reconstruction/correction parallelism is per tomogram. Use a
  // conservative single rank until tomogram-count-aware allocation is available.
  set('nr_mpi',1);set('nr_threads',cpus);
  if(['Motion correction','CTF estimation'].includes(layout.name)){
   if(layout.name==='CTF estimation')set('nr_mpi',cpus);
   if(layout.name==='Motion correction'){set('nr_mpi',cpus);set('nr_threads',1);}
   if(layout.name==='Motion correction'&&v.do_own_motioncor==='No')set('gpu_ids',gpu());
  }else if(['3D classification','3D auto-refine','3D initial reference'].includes(layout.name)){
   set('use_gpu',global.use_gpu??'Yes');set('gpu_ids',gpu());
   if(layout.name==='3D classification'&&v.dont_skip_align==='No')set('use_gpu','No');
   if(layout.name!=='3D initial reference'){
    const workers=gpus;
    set('nr_mpi',workers+1);set('nr_threads',Math.max(1,Math.floor(cpus/workers)));
   }
  }else if(layout.name==='Align tilt-series')set('gpu_ids',gpu());
  else if(layout.name==='Denoise tomograms'){set('gpu_ids',v.do_cryocare_train==='Yes'?(gpu()||'0'):(ids.split(/[:,]/)[0]||'0'));}
  else if(layout.name==='ModelAngelo building')set('gpu_id',0);
  if(['Import tilt series','Exclude tilt-images','Pick tomograms','Subset selection'].includes(layout.name))set('do_queue','No');
  for(const [key,value]of Object.entries(v))if(value==='TBD'||value===undefined)throw Error('No workstation value available for '+key+'. Configure the workstation before scheduling.');
  return v;
 }
 switch(layout.name){
 case 'Motion correction':if(v.do_own_motioncor==='Yes'){set('nr_mpi',1);set('nr_threads',cpus);}else{set('nr_mpi',gpus);set('nr_threads',4*gpus);set('gpu_ids',gpu());}break;
 case 'Local resolution':case 'CTF estimation':case 'Particle extraction':set('nr_mpi',cpus);break;
 case 'Auto-picking':
  if(v.do_topaz==='Yes'){set('nr_mpi',v.do_topaz_train==='Yes'?1:gpus);set('nr_threads',1);set('use_gpu','Yes');set('gpu_ids',gpu());}
  else if(v.do_log==='Yes'){set('nr_mpi',cpus);set('use_gpu','No');set('gpu_ids','');}
  else{set('use_gpu',global.use_gpu??'Yes');set('gpu_ids',gpu());set('nr_mpi',v.do_write_fom_maps==='Yes'?1:gpus);}break;
 case '2D classification':case '3D initial reference':case '3D classification':case '3D auto-refine':
  set('gpu_ids',gpu());set('use_gpu','Yes');
  if(layout.name==='3D classification'&&v.dont_skip_align==='No')set('use_gpu','No');
  if(v.do_grad==='Yes'||layout.name==='3D initial reference'){set('nr_mpi',1);set('nr_threads',cpus);}
  else{if(cpus%gpus!==0)throw Error('EM resource rule requires globalNcpus / globalNgpus to be a positive integer. Adjust Workstation / cluster defaults.');set('nr_mpi',gpus+1);set('nr_threads',cpus/gpus);}break;
 case 'Mask creation':set('nr_threads',cpus);break;
 case 'CTF refinement':set('nr_mpi',1);set('nr_threads',cpus);break;
 case 'Bayesian polishing':if(v.do_param_optim==='Yes'){set('nr_mpi',1);set('nr_threads',cpus);}else{set('nr_mpi',3);set('nr_threads',4);}break;
 case 'DynaMight flexibility':set('nr_threads',4);set('gpu_id',0);break;
 case 'ModelAngelo building':set('gpu_id',0);break;
 }
 if(['Import','Manual picking','Subset selection'].includes(layout.name))set('do_queue','No');
 for(const [key,value]of Object.entries(v))if(value==='TBD'||value===undefined)throw Error('No workstation value available for '+key+'. Configure the workstation before scheduling.');
 return v;
}
