export const halfFields=new Set(['psi_sampling','offset_step','offset_range','sigma_angles','range_tilt','range_psi']);
export function continuationTools(layout,job,completed){
 return ['2D classification','3D classification','3D initial reference'].includes(layout.name)&&!!job&&
 !['Running','Scheduled'].includes(job.status)&&(job.status==='Succeeded'||completed.has(job.name));
}
export function iterationKey(layout){return layout.name==='2D classification'?'nr_iter_em':'nr_iter';}
export function halfValue(value){
 if(typeof value!=='string'||!value.trim()||!Number.isFinite(Number(value)))throw new Error('Enter a finite numeric value before dividing by two.');
 const n=Number(value),half=n/2;
 if(n!==0&&half===0)throw new Error('This value is too small to halve.');
 return String(half);
}

export function increaseContinuationIterations(layout,values,previous){
 const file=String(values.fn_cont||'').trim();
 if(!['2D classification','3D classification','3D initial reference'].includes(layout.name)||!file||file===String(previous||'').trim())return null;
 const grad=values.do_grad==='Yes',em=values.do_em==='Yes';
 if(layout.name==='2D classification'&&grad===em)return null;
 const key=layout.name!=='2D classification'?'nr_iter':grad?'nr_iter_grad':'nr_iter_em',step=layout.name==='3D initial reference'||key==='nr_iter_grad'?50:10,n=Number(values[key]);
 if(!String(values[key]??'').trim()||!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(n+step))return null;
 values[key]=String(n+step);return key;
}
