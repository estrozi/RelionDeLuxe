import {requestId} from './request-id.js';
// One session per draft editor. Retain a completed or in-flight preview on tab switches.
export function ctfPreviewSession(){return {seed:requestId(),key:null,promise:null,micrograph:null,excludeMicrograph:null};}
const keys=['input_star_mics','box','resmin','resmax','dfmin','dfmax','dfstep','dast','do_phaseshift','phase_min','phase_max','phase_step','fn_ctffind_exe','ctf_win','slow_search','use_given_ps','use_noDW','localsearch_nominal_defocus','exp_factor_dose','other_args'];
export function ctfCircleLimits(data,current,width){
 const angpix=Number(data.fittingAngpix??data.angpix);
 const resmin=Number(current.resmin),requested=Math.max(Number(current.resmax),2*Number(data.angpix)||0);
 const resmax=Number(current.resmax)===Number(data.resmax)&&resmin===Number(data.resmin)?Number(data.actualResmax??requested):
  data.tomo&&data.doseFactor>0&&data.preExposure!==null?Math.min(requested*Math.exp(data.preExposure/data.doseFactor),resmin*.9):requested;
 const min=Number(current.resmin)===Number(data.resmin)?Number(data.actualResmin??resmin):resmin;
 return {resmin:min,resmax,radii:[width*angpix/min,width*angpix/resmax]};
}
export function ctfSliderLimits(values,angpix){
 const lower=Math.ceil(2*angpix*2)/2;
 const low=Math.min(50,Math.max(lower+.5,Math.round(Number(values.resmin)*2)/2));
 const high=Math.max(lower,Math.min(low-.5,Math.round(Number(values.resmax)*2)/2));
 return {lower,resmin:low,resmax:high};
}
export function mountCtfPreview({container,session,getValues,token,el,disabled=false}){
 let disposed=false,lastData=null;
 const status=el('p',''),button=el('button','Update preview'),canvas=el('canvas');
 button.type='button';canvas.width=canvas.height=512;canvas.hidden=true;canvas.style.cssText='max-width:100%;height:auto;background:#111';status.setAttribute('role','status');
 const actions=el('div',undefined,'ctf-preview-actions');actions.append(status,button);container.append(actions,canvas);
 const render=data=>{
  lastData=data;
  const bytes=Uint8Array.from(atob(data.image),c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),w=view.getUint32(0,true),h=view.getUint32(4,true);
  canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d'),rgba=ctx.createImageData(w,h);
  let mean=0,m2=0,n=0;for(let i=0;i<w*h;i++){const v=view.getFloat32(8+4*i,true);if(Number.isFinite(v)){n++;const d=v-mean;mean+=d/n;m2+=d*(v-mean);}}
  const sd=Math.sqrt(m2/Math.max(1,n))||1;
  for(let i=0;i<w*h;i++){const v=Math.max(0,Math.min(255,127.5+(view.getFloat32(8+4*i,true)-mean)*255/(6*sd)));rgba.data.set([v,v,v,255],i*4);}
  ctx.putImageData(rgba,0,0);
  const values=getValues(),angpix=Number(data.angpix);
  const resmax=container.querySelector('#f-resmax'),resmin=container.querySelector('#f-resmin');
  if(resmax&&resmin&&angpix>0){
   // Half-Å grid; round upwards to stay on the allowed side of Nyquist.
   const {lower,resmin:low,resmax:high}=ctfSliderLimits(values,angpix);
   resmax.step=resmin.step='0.5';resmax.min=String(lower);resmax.max=String(Math.max(lower,low-.5));
   resmin.min=String(Math.min(50,high+.5));resmin.max='50';
   for(const [key,control,value] of [['resmin',resmin,low],['resmax',resmax,high]]){
    control.value=String(value);
    if(Number(values[key])!==value)control.oninput?.();
    const output=container.querySelector('output[for="f-'+key+'"]');if(output)output.textContent=control.value+' Å';
   }
  }
  if(angpix>0){
   ctx.save();ctx.strokeStyle='#ffeb3b';ctx.lineWidth=Math.max(2,w/256);
   const limits=ctfCircleLimits(data,getValues(),w);
   for(const radius of limits.radii)if(Number.isFinite(radius)&&radius>0){ctx.beginPath();ctx.arc(w/2,h/2,radius,0,2*Math.PI);ctx.stroke();}
   ctx.restore();
  }
  const changed=['resmin','resmax'].some(key=>Number(getValues()[key])!==Number(data[key]));
  canvas.hidden=false;status.textContent=data.micrograph+
   (data.fittingAngpix>0?` · Diagnostic scale: ${data.fittingAngpix} Å/pixel`:'')+
   (data.tomo&&Number(data.actualResmax)!==Number(data.resmax)?` · CTFFIND search limit for this tilt: ${Number(data.actualResmax).toFixed(2)} Å (dose-adjusted from ${data.resmax} Å)`:'')+
   (data.scaleSource==='input STAR (fallback)'?' · CTFFIND fitting scale unavailable; circles use the input pixel size.':'')+
   (changed?' · Circles show edited limits; update preview to recalculate.':'');

 };
 const redrawCircles=event=>{if(lastData&&['box','resmin','resmax','dfmin','dfmax'].includes(event.target?.name))queueMicrotask(()=>{if(!disposed&&lastData)render(lastData);});};
 container.addEventListener('input',redrawCircles);
 const run=async(force=false)=>{
  if(disabled){status.textContent='Preview requires a writable native RELION project.';button.disabled=true;return;}
  const values=getValues(),key=JSON.stringify(keys.map(k=>values[k]??''));
  if(!values.input_star_mics){status.textContent='Choose an input micrographs STAR file in I/O.';return;}
  if(force){session.seed=requestId();session.excludeMicrograph=session.micrograph;}
  const scroll=document.querySelector('#parameters'),scrollTop=scroll?.scrollTop,inspector=document.querySelector('.inspector-body'),inspectorTop=inspector?.scrollTop;
  button.disabled=true;status.textContent='Running CTFFIND on one micrograph… Please wait.';
  if(force||session.key!==key||!session.promise){session.key=key;session.promise=(async()=>{const response=await fetch('/api/ctf-preview',{method:'POST',headers:{'Content-Type':'application/json','X-Relion-Token':token,'X-Request-ID':requestId()},body:JSON.stringify({values,seed:session.seed,excludeMicrograph:session.excludeMicrograph})});const data=await response.json();if(!response.ok)throw Error(data.error||'CTF preview failed');session.micrograph=data.micrograph;return data;})();}
  const pending=session.promise;
  try{const data=await pending;if(!disposed){if(key!==JSON.stringify(keys.map(k=>getValues()[k]??''))){status.textContent='Settings changed during the calculation. Click Update preview.';}else{render(data);session.key=JSON.stringify(keys.map(k=>getValues()[k]??''));}}}catch(e){if(session.promise===pending)session.promise=null;if(!disposed)status.textContent='Preview failed: '+e.message;}finally{if(!disposed){button.disabled=false;if(scroll)scroll.scrollTop=scrollTop;if(inspector)inspector.scrollTop=inspectorTop;}}
 };
 button.onclick=()=>run(true);run();return ()=>{disposed=true;container.removeEventListener('input',redrawCircles);};
}
export function ctfPreviewTabs(tabs,name,existing){
 if(name!=='CTF estimation'||existing)return tabs;
 const result={};for(const [key,fields] of Object.entries(tabs)){result[key]=key==='CTFFIND-4.1'?fields.filter(field=>!['box','resmin','resmax','dfmin','dfmax'].includes(field)):fields;if(key==='I/O')result.Preview=['box','resmin','resmax','dfmin','dfmax'];}return result;
}
