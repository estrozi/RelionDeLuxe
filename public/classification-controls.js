export const ctfAlwaysOn=['2D classification','3D classification','3D initial reference','3D auto-refine'];
export function normalizeClassification(layout,values){
 if(ctfAlwaysOn.includes(layout.name))values.do_ctf_correction='Yes';
 if(layout.name!=='2D classification')return;
 const gradient=values.do_grad==='Yes';
 values.do_grad=gradient?'Yes':'No';values.do_em=gradient?'No':'Yes';
 if(gradient)values.nr_mpi='1';
}
export function showClassificationField(layout,values,key){
 if(ctfAlwaysOn.includes(layout.name)&&key==='do_ctf_correction')return false;
 if(layout.name!=='2D classification')return true;
 return !(layout.fields?.[key]?.when||[]).some(r=>['do_em','do_grad'].includes(r.key)&&values[r.key]!==r.value);
}
