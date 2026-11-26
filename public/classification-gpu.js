const previousGpu=new WeakMap();

export function classificationAlignmentGpu(layout,values,changed=false){
 if(layout.name!=='3D classification')return values.use_gpu;
 if(values.dont_skip_align==='No'){
  if(!previousGpu.has(values))previousGpu.set(values,values.use_gpu);
  values.use_gpu='No';
 }else if(changed&&previousGpu.has(values)){
  values.use_gpu=previousGpu.get(values);
  previousGpu.delete(values);
 }
 return values.use_gpu;
}
