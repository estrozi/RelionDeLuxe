// Stock RELION accepts one gpu_ids value but appends other_args unchanged.
// Its Python denoise wrapper accepts repeated --gpu flags and writes the list
// to cryoCARE's JSON. This representation also works with the stock scheduler.
export function cryocareGpuIds(value){
 const raw=String(value??'').trim();if(!raw)return [];
 if(!/^\d+(?:\s*[:,]\s*\d+)*$/.test(raw))throw Error('cryoCARE GPU IDs must be nonnegative integers separated by commas or colons, e.g. 0,1.');
 const ids=raw.split(/\s*[:,]\s*/).map(Number);
 if(ids.some(n=>!Number.isSafeInteger(n)||n>2147483647)||new Set(ids).size!==ids.length)throw Error('cryoCARE GPU IDs must be distinct valid integers.');
 return ids;
}
export function encodeCryocare(values){
 const ids=cryocareGpuIds(values.gpu_ids);
 if(ids.length>1&&values.do_cryocare_train!=='Yes')throw Error('This cryoCARE version supports multiple GPUs for training only. For prediction, select one GPU.');
 const other=values.other_args||'';
 if(/(?:^|\s)--gpu(?:\s|=|$)/.test(other))throw Error('Enter all cryoCARE GPU IDs in Which GPUs to use, not in Additional arguments.');
 if(ids.length<2)return {...values,gpu_ids:ids.length?String(ids[0]):''};
 return {...values,gpu_ids:String(ids[0]),other_args:ids.slice(1).map(id=>'--gpu '+id).join(' ')+(other?' '+other:'')};
}
export function decodeCryocare(values){
 if(!/^\d+$/.test(values.gpu_ids||''))return values;
 let rest=values.other_args||'',ids=[values.gpu_ids],match;
 while((match=rest.match(/^--gpu\s+(\d+)(?:\s+|$)/))){ids.push(match[1]);rest=rest.slice(match[0].length);}
 return ids.length>1?{...values,gpu_ids:ids.join(','),other_args:rest}:values;
}
export class CryocareAdapter{
 constructor(base){this.base=base;this.env=base.env;}
 async call(args){const result=await this.base.call(args);
  if(args[0]==='job'&&result.type===58)return {...result,values:decodeCryocare(result.values)};
  if(args[0]==='schema')return result.map(s=>s.id===58?{...s,options:s.options.map(f=>f.key==='care_denoising_model'?{...f,pattern:'cryoCARE denoising model (*.tar.gz)',help:f.help+' Typical path: Denoise/job013/denoising_model.tar.gz.'}:f.key==='gpu_ids'?{...f,label:'Which GPUs to use:',help:'Training: enter one or more GPU IDs separated by commas or colons (e.g. 0,1). Requires a multi-GPU-capable cryoCARE installation. Prediction currently supports one GPU. No MPI is used. RelionDeLuxe stores additional GPUs as repeated --gpu options in native Additional arguments for scheduler compatibility.'}:f)}:s);
  return result;
 }
 async submit(action,layout,schema,values,...rest){return this.base.submit(action,layout,schema,layout.id===58?encodeCryocare(values):values,...rest);}
}
