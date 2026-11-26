import {requestId} from './request-id.js';
const previewCache=new Map();
const pickingSignature=v=>JSON.stringify(['fn_input_autopick','do_log','log_diam_min','log_diam_max','log_maxres','log_adjust_thr','log_upper_thr','log_invert','do_read_fom_maps','do_write_fom_maps','other_args','angpix'].map(k=>[k,v[k]??'']));
export function mountLogPreview({container,file,token,getValues,min,max,el}){
 const box=el('div',undefined,'log-preview'),status=el('p','Loading most defocused micrograph…'),canvas=document.createElement('canvas'),zoom=document.createElement('input');
 canvas.width=canvas.height=256;canvas.style.cssText='width:256px;max-width:100%;height:auto;touch-action:none;cursor:grab';
 zoom.type='number';zoom.min='.05';zoom.max='8';zoom.step='.05';zoom.value='0.25';
 const label=el('label','Scale ');label.append(zoom);label.className='log-scale';label.title='Screen pixels per micrograph pixel';
 box.append(label,canvas,status);const first=min?.closest('.field');if(first)first.before(box);else container.prepend(box);
 const controls=el('div',undefined,'log-preview-controls');
 const slider=(name,minValue,maxValue,step,value)=>{const label=el('label',name+' '),input=document.createElement('input');input.type='range';input.min=minValue;input.max=maxValue;input.step=step;input.value=value;input.setAttribute('aria-label',name);label.append(input);controls.append(label);return input;};
 const brightness=slider('Brightness',0,200,1,100),contrast=slider('Contrast',10,400,1,100);
 const stage=el('div',undefined,'log-preview-stage'),left=el('div',undefined,'log-preview-side'),right=el('div',undefined,'log-preview-side');
 const threshold=document.createElement('input');threshold.type='number';threshold.step='0.01';threshold.placeholder='All';threshold.setAttribute('aria-label','Minimum picking figure of merit');const thresholdLabel=el('label','Min FOM ');thresholdLabel.className='log-scale';thresholdLabel.title='Hide preview picks below this figure of merit. Empty shows all. This display filter does not change job parameters or output files.';thresholdLabel.append(threshold);
 left.append(brightness.parentElement,thresholdLabel);right.append(contrast.parentElement,label);stage.append(left,canvas,right);box.insertBefore(stage,status);
 const minRow=min?.closest('.field'),maxRow=max?.closest('.field');
 if(minRow&&maxRow){const pair=el('div',undefined,'log-diameter-pair');minRow.before(pair);pair.append(minRow,maxRow);}

 const ctx=canvas.getContext('2d'),abort=new AbortController();let image,nx,ny,pixel,cx,cy,micrograph,revision,points=[],pickDiameter=0,hasResult=false,cachedSignature;
 const test=el('button','Test picking'),result=el('span','');test.type='button';test.disabled=true;test.title='Run LoG locally on this entire micrograph, without creating a job';const actions=el('div',undefined,'log-preview-actions');result.setAttribute('role','status');actions.append(test,result,status);stage.append(actions);
 const visible=p=>threshold.value===''||!Number.isFinite(Number(threshold.value))||p.fom==null||p.fom>=Number(threshold.value);
 const updatePickCount=()=>{if(hasResult){const unknown=points.filter(p=>p.fom==null).length;result.textContent=` ${points.filter(visible).length} / ${points.length} picks shown · green circles show mean diameter`+(unknown?` · ${unknown} without FOM remain visible`:'');}};
 const draw=()=>{
  if(!image)return;const scale=Number(zoom.value);if(!(scale>=.05&&scale<=8))return;
  ctx.fillStyle='#151515';ctx.fillRect(0,0,256,256);
  ctx.filter='brightness('+brightness.value+'%) contrast('+contrast.value+'%)';
  ctx.drawImage(image,128-cx*scale,128-cy*scale,nx*scale,ny*scale);
  ctx.filter='none';
  ctx.strokeStyle='#00FF00';ctx.lineWidth=2;for(const p of points){if(!visible(p))continue;ctx.beginPath();ctx.arc(128+(p.x-cx)*scale,128+(p.y-cy)*scale,pickDiameter/pixel*scale/2,0,2*Math.PI);ctx.stroke();}
  ctx.strokeStyle='#FFFF00';ctx.lineWidth=2;
  for(const input of [min,max]){const diameter=Number(input?.value);if(diameter>0){ctx.beginPath();ctx.arc(128,128,diameter/pixel*scale/2,0,2*Math.PI);ctx.stroke();}}
 };
 const options={signal:abort.signal};
 threshold.addEventListener('input',()=>{const cached=previewCache.get(cachedSignature);if(cached)cached.threshold=threshold.value;updatePickCount();draw();},options);
 const signature=()=>pickingSignature(getValues());
 container.addEventListener('input',e=>{if(e.target.id?.startsWith('f-')&&cachedSignature!==signature()){hasResult=false;points=[];result.textContent='Settings changed; test again.';draw();}},options);
 test.addEventListener('click',async()=>{const before=signature();test.disabled=true;hasResult=false;points=[];draw();result.textContent=' Picking this micrograph…';try{
 const r=await fetch('/api/log-picking-preview',{method:'POST',headers:{'Content-Type':'application/json','X-Relion-Token':token,'X-Request-ID':requestId()},body:JSON.stringify({values:getValues(),micrograph,revision}),signal:abort.signal});const data=await r.json();if(!r.ok)throw Error(data.error);
 if(before!==signature()){result.textContent='Settings changed; test again.';return;}points=data.points;pickDiameter=data.diameter;hasResult=true;cachedSignature=before;previewCache.clear();previewCache.set(before,{...data,revision,threshold:threshold.value});updatePickCount();draw();
 }catch(e){if(e.name!=='AbortError')result.textContent=' '+e.message;}finally{test.disabled=false;}},options);
 brightness.addEventListener('input',draw,options);contrast.addEventListener('input',draw,options);
 const diameterSliders=[];
 for(const [input,title] of [[min,'Minimum diameter (Å)'],[max,'Maximum diameter (Å)']]){
  if(!input)continue;
  const range=document.createElement('input');range.type='range';range.min='1';range.max=String(Math.max(1000,Number(input.value)||0));range.step='1';range.value=input.value;range.className='log-diameter-slider';range.setAttribute('aria-label',title);
  const row=input.closest('.field');const caption=row?.querySelector('label');if(caption)caption.textContent=input===min?'Min diam. for LoG (A)':'Max diam. for LoG (A)';input.size=4;row?.append(range);diameterSliders.push(range);
  const sync=()=>{range.disabled=input.disabled;const value=Number(input.value);if(Number.isFinite(value)){range.min=input===max?String(Math.max(1,Number(min?.value)||1)):'1';range.max=input===min&&Number(max?.value)>0?max.value:String(Math.max(1000,value,Number(min?.value)||0));range.value=String(value);}draw();};
  input.addEventListener('input',sync,options);(input===min?max:min)?.addEventListener('input',sync,options);
  range.addEventListener('input',()=>{input.value=range.value;input.dispatchEvent(new Event('input',{bubbles:true}));},options);sync();
 }

 min?.addEventListener('input',draw,options);max?.addEventListener('input',draw,options);zoom.addEventListener('input',draw,options);
 let drag;
 canvas.onpointerdown=e=>{if(e.button!==0)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx,cy};};
 canvas.onpointermove=e=>{if(!drag||!image)return;const s=Number(zoom.value)*canvas.getBoundingClientRect().width/256;if(!(s>0))return;cx=Math.max(0,Math.min(nx,drag.cx-(e.clientX-drag.x)/s));cy=Math.max(0,Math.min(ny,drag.cy-(e.clientY-drag.y)/s));draw();};
 canvas.onpointerup=e=>{drag=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};canvas.onpointercancel=canvas.onlostpointercapture=()=>{drag=null;};
 (async()=>{try{
  if(!file)throw Error('Choose an input micrographs STAR file in I/O.');
  const r=await fetch('/api/log-preview?'+new URLSearchParams({file}),{headers:{'X-Relion-Token':token},signal:abort.signal});
  if(!r.ok)throw Error((await r.json()).error);
  const data=await r.arrayBuffer(),view=new DataView(data),w=view.getUint32(0,true),h=view.getUint32(4,true),pixels=new Float32Array(data,8);
  nx=Number(r.headers.get('X-Image-Nx'));ny=Number(r.headers.get('X-Image-Ny'));pixel=Number(r.headers.get('X-Pixel-Size'));cx=nx/2;cy=ny/2;
  let count=0,mean=0,m2=0;for(const value of pixels)if(Number.isFinite(value)){count++;const d=value-mean;mean+=d/count;m2+=d*(value-mean);}
  const sd=Math.sqrt(m2/Math.max(1,count))||1;
  image=document.createElement('canvas');image.width=w;image.height=h;const context=image.getContext('2d'),rgba=context.createImageData(w,h);
  for(let i=0;i<pixels.length;i++){const v=Math.max(0,Math.min(255,127.5+(pixels[i]-mean)*255/(6*sd)));rgba.data.set([v,v,v,255],i*4);}context.putImageData(rgba,0,0);
  revision=r.headers.get('X-Input-Revision');micrograph=decodeURIComponent(r.headers.get('X-Micrograph'));test.disabled=false;const cached=previewCache.get(signature());if(cached&&cached.micrograph===micrograph&&cached.revision===revision){points=cached.points;pickDiameter=cached.diameter;threshold.value=cached.threshold||'';cachedSignature=signature();hasResult=true;updatePickCount();}
  status.textContent=micrograph+' · defocus U: '+r.headers.get('X-Defocus')+' Å · '+pixel+' Å/pixel · Drag to pan; yellow circles show min/max diameter. Preview is downsampled.';
  draw();
 }catch(e){if(e.name!=='AbortError')status.textContent=e.message;}})();
 return ()=>{abort.abort();diameterSliders.forEach(s=>s.remove());};
}
