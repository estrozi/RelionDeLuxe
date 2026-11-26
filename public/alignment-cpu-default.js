// Recognize the generated value so a later workstation CPU change can refresh it.
// Other user-provided arguments are never rewritten.
export function alignmentCpuDefault(layout,values,global,cluster,edited=false){
 if(cluster||layout?.name!=='Align tilt-series'||edited)return false;
 const cpus=Number(global?.globalNcpus);
 if(!Number.isSafeInteger(cpus)||cpus<1)return false;
 const previous=String(values.other_args??'').trim();
 if(previous&&!/^--other_wrapper_args\s+(["'])-cpus localhost:\d+\1$/.test(previous))return false;
 const next=`--other_wrapper_args "-cpus localhost:${cpus}"`;
 if(previous===next)return false;
 values.other_args=next;
 return true;
}
