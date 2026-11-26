import {supportColor} from './support-menu.js';
import {probeDomain,probePoint,probeLongitude,probeLatitude} from './probe-domain.js';
import {sphereProbeSize,sphereSliceGuide} from './tomo-view.js';
import {sampleSupports,sphereProjection,projectionMinima,withinBrush} from './tomo-supports.js';
import {requestId} from './request-id.js';
export function createSphereProbe({job,token,getSupport,getItem,canRotate=()=>false,onRotate=()=>{},onExclude=()=>{},onMinima=()=>{},onHover=()=>{}}){
 const panel=document.createElement('section');panel.className='sphere-probe';panel.hidden=true;
 panel.innerHTML='<div class="probe-title"><strong>Sphere probe</strong><button type="button" class="probe-update">Update</button><button type="button" class="probe-minimize" title="Minimize sphere probe" aria-label="Minimize sphere probe" aria-expanded="true">−</button></div><div class="probe-image"><canvas aria-label="Equal-area sphere surface intensity"></canvas></div><div class="probe-ticks"></div><div class="probe-poles" role="radiogroup" aria-label="Projection pole axis"><span>Cylindrical projection poles</span><label><input type="radio" name="probe-pole" value="X">X</label><label><input type="radio" name="probe-pole" value="Y">Y</label><label><input type="radio" name="probe-pole" value="Z" checked>Z</label></div><div class="probe-particles"><label><input type="checkbox" class="probe-erase">Erase (10px)</label><label>Step (°)<input class="probe-step" type="number" min=".1" max="180" step=".1" value="5"></label><button data-turn="left" title="Rotate left">←</button><button data-turn="up" title="Rotate up near the projection center">↑</button><button data-turn="down" title="Rotate down near the projection center">↓</button><button data-turn="right" title="Rotate right">→</button><button class="probe-minima">Put ptcls at local minima</button></div><small>−180° · longitude · +180°; top +Z, bottom −Z</small><div class="probe-status">Press Update to sample the sphere.</div>';
 document.body.append(panel);
 const button=panel.querySelector('.probe-update'),canvas=panel.querySelector('canvas'),status=panel.querySelector('.probe-status'),header=panel.querySelector('.probe-title');
 let busy=false,stamp='',drag=null,base=null,rectangle=null,raw=null,brush=null;
 let hover=null,minimized=false,expandedSize=null;
 const shifts=()=>probeDomain(raw).width===1?[-1,0,1]:[0];
 const projected=(p,s)=>probePoint(sphereProjection(p,s.center,s.radius,pole()),raw);
 const pole=()=>panel.querySelector('input[name=probe-pole]:checked').value;
 const current=()=>{const s=getSupport(),item=getItem();return s?.type==='spheres'&&s.tomogram===item?.row.rlnTomoName?s:null;};
 const imageBox=panel.querySelector('.probe-image');
 const size=()=>minimized&&expandedSize?expandedSize:sphereProbeSize(imageBox.clientWidth,imageBox.clientHeight);
 const minimize=panel.querySelector('.probe-minimize');
 minimize.onclick=()=>{
  if(!minimized)expandedSize=size();
  minimized=!minimized;panel.classList.toggle('minimized',minimized);
  minimize.textContent=minimized?'□':'−';minimize.title=minimized?'Restore sphere probe':'Minimize sphere probe';
  minimize.setAttribute('aria-label',minimize.title);minimize.setAttribute('aria-expanded',String(!minimized));
  hover=null;brush=null;rectangle=null;onHover();refresh();
 };
 const key=()=>JSON.stringify({support:current()?{id:current().id,tomogram:current().tomogram,center:current().center,radius:current().radius}:null,source:document.querySelector('#source').value,poleAxis:pole(),width:size().width});
 const inverted=()=>!!document.querySelector('#invert')?.checked;
 document.querySelector('#invert')?.addEventListener('input',()=>refresh());
 function refresh(){
  panel.querySelector('.probe-minima').textContent='Put ptcls at local minima';
  panel.hidden=!current();button.disabled=busy||!current();
  panel.querySelectorAll('[data-turn]').forEach(b=>b.disabled=busy||!canRotate()||!current()||!base||stamp!==key());
  panel.querySelector('.probe-minima').disabled=busy||!canRotate()||!current()||!raw||stamp!==key();
  paint();
  if(!busy&&stamp&&stamp!==key())status.textContent='Outdated preview — Update for '+size().width+'×'+size().height+' samples.';
 }
 function paint(){
  if(!base||minimized)return;
  panel.querySelector('.probe-ticks').style.width=Math.min(imageBox.clientWidth,canvas.width/canvas.height*imageBox.clientHeight)+'px';
  const ctx=canvas.getContext('2d');
  if(inverted()){
   const image=new ImageData(new Uint8ClampedArray(base.data),base.width,base.height);
   for(let i=0;i<raw.values.length;i++)if(raw.values[i]!==null)for(let c=0;c<3;c++)image.data[i*4+c]=255-image.data[i*4+c];
   ctx.putImageData(image,0,0);
  }else ctx.putImageData(base,0,0);
  if(stamp!==key())return;
  const guide=sphereSliceGuide(current(),getItem()?.geometry,pole());
  if(guide&&(guide.y-probeDomain(raw).y)/probeDomain(raw).height>=0&&(guide.y-probeDomain(raw).y)/probeDomain(raw).height<=1){guide.y=(guide.y-probeDomain(raw).y)/probeDomain(raw).height;ctx.strokeStyle='#ffff00';ctx.lineWidth=Math.max(1,canvas.width/Math.max(1,imageBox.clientWidth));ctx.beginPath();ctx.moveTo(0,guide.y*canvas.height);ctx.lineTo(canvas.width,guide.y*canvas.height);ctx.stroke();}
  if(!document.querySelector('#crosses').checked)return;
  try{
   const support=current();ctx.strokeStyle=supportColor(support.id);const crossSize=3*canvas.width/Math.max(1,Math.min(imageBox.clientWidth,canvas.width/canvas.height*imageBox.clientHeight));ctx.lineWidth=Math.max(.65,crossSize/3);
   for(const p of sampleSupports([support])){
    if(brush?.removed.has(p.sampleIndex))continue;
    const [x,y]=projected(p.position,support);
    // Repeat across the longitude seam so edge crosses are not lost.
    for(const shift of shifts()){const px=(x+shift)*canvas.width,py=y*canvas.height;
     ctx.beginPath();ctx.moveTo(px-crossSize,py);ctx.lineTo(px+crossSize,py);ctx.moveTo(px,py-crossSize);ctx.lineTo(px,py+crossSize);ctx.stroke();
    }
   }
   if(rectangle){
    const [x,y]=rectangle.start,[u,v]=rectangle.end;
    ctx.strokeStyle=rectangle.keepOnly?'#00ffff':'#ff5555';ctx.lineWidth=1;ctx.strokeRect(x*canvas.width,y*canvas.height,(u-x)*canvas.width,(v-y)*canvas.height);
   }
  }catch(e){status.textContent='Cannot show particles: '+e.message;}
 }
 const point=e=>{
  const r=canvas.getBoundingClientRect(),ratio=canvas.width/canvas.height,w=Math.min(r.width,ratio*r.height),h=w/ratio;
  return [(e.clientX-r.left-(r.width-w)/2)/w,(e.clientY-r.top-(r.height-h)/2)/h];
 };
 canvas.addEventListener('pointermove',e=>{const p=point(e);hover=p.every(v=>v>=0&&v<=1)?{x:p[0],key:key()}:null;onHover();});
 canvas.addEventListener('pointerleave',()=>{hover=null;onHover();});
 function brushAt(e){
  if(!brush)return;
  if(brush.key!==key()||brush.snapshot!==JSON.stringify(current())||!canRotate()||!panel.querySelector('.probe-erase').checked){brush=null;paint();return;}
  const r=canvas.getBoundingClientRect(),ratio=canvas.width/canvas.height,w=Math.min(r.width,ratio*r.height),h=w/ratio,p=point(e).map((v,i)=>v*(i?h:w));
  const support=current();
  for(const particle of sampleSupports([support])){
   const xy=projected(particle.position,support);
   if(shifts().some(shift=>withinBrush([(xy[0]+shift)*w,xy[1]*h],brush.last||p,p,10)))brush.removed.add(particle.sampleIndex);
  }
  brush.last=p;paint();
 }
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||!panel.querySelector('.probe-erase').checked)return;e.preventDefault();
  if(busy||!canRotate()||!base||stamp!==key()||!document.querySelector('#crosses').checked)return;
  const p=point(e);if(p.some(v=>v<0||v>1))return;
  brush={id:e.pointerId,key:key(),snapshot:JSON.stringify(current()),removed:new Set()};
  canvas.setPointerCapture(e.pointerId);brushAt(e);
 });
 canvas.addEventListener('pointermove',e=>{if(brush?.id===e.pointerId)brushAt(e);});
 canvas.addEventListener('pointerup',e=>{
  if(brush?.id!==e.pointerId)return;brushAt(e);const done=brush;brush=null;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(done?.removed.size)onExclude([...done.removed]);paint();
 });
 canvas.addEventListener('pointercancel',()=>{brush=null;paint();});
 canvas.addEventListener('lostpointercapture',()=>{if(brush){brush=null;paint();}});
 for(const type of ['mousedown','auxclick'])canvas.addEventListener(type,e=>{if(e.button===1)e.preventDefault();});
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==1)return;e.preventDefault();
  if(busy||!canRotate()||!base||stamp!==key()||!document.querySelector('#crosses').checked)return;
  const p=point(e);if(p.some(v=>v<0||v>1))return;
  rectangle={start:p,end:p,id:e.pointerId,keepOnly:e.shiftKey,snapshot:JSON.stringify(current()),key:key()};
  canvas.setPointerCapture(e.pointerId);paint();
 });
 canvas.addEventListener('pointermove',e=>{if(rectangle?.id!==e.pointerId)return;rectangle.end=point(e);paint();});
 canvas.addEventListener('pointerup',e=>{
  if(rectangle?.id!==e.pointerId)return;
  const box=rectangle;rectangle=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(busy||!canRotate()||box.key!==key()||box.snapshot!==JSON.stringify(current())){paint();return;}
  const end=point(e),lo=box.start.map((v,i)=>Math.min(v,end[i])),hi=box.start.map((v,i)=>Math.max(v,end[i]));
  const support=current(),all=sampleSupports([support]),inside=p=>{
   const xy=projected(p.position,support);
   return xy.every((v,i)=>v>=lo[i]&&v<=hi[i]);
  },kept=all.filter(inside),removed=all.filter(p=>box.keepOnly?!inside(p):inside(p));
  if(box.keepOnly&&!confirm('Are you sure you want to keep/delete '+kept.length+'/'+removed.length+' particles? This affects the selected sphere only.')){paint();return;}
  onExclude(removed.map(p=>p.sampleIndex));paint();
 });
 const cancelRectangle=()=>{rectangle=null;paint();};
 canvas.addEventListener('pointercancel',cancelRectangle);
 canvas.addEventListener('lostpointercapture',()=>{if(rectangle)cancelRectangle();});
 panel.querySelector('.probe-minima').onclick=()=>{
  if(busy||!canRotate()||!raw||stamp!==key())return;
  const directions=projectionMinima(raw,inverted());
  if(confirm('Replace this sphere’s existing particles with '+directions.length+' local-minimum particles under the current contrast?')){onMinima(directions);refresh();}
 };
 document.querySelector('#crosses').addEventListener('change',()=>{brush=null;rectangle=null;paint();});
 panel.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>{
  const step=Number(panel.querySelector('.probe-step').value);
  if(!(step>0&&step<=180)){status.textContent='Choose a rotation step from 0 to 180 degrees (exclusive of zero).';return;}
  try{onRotate(pole(),b.dataset.turn,step);refresh();}catch(e){status.textContent=e.message;}
 });
 panel.querySelectorAll('input[name=probe-pole]').forEach(input=>input.onchange=()=>{refresh();if(!stamp&&!busy)status.textContent='Press Update to sample with '+pole()+' poles.';});
 button.onclick=async()=>{
  const support=current();if(!support||busy)return;
  const requested=size(),snapshot=key();busy=true;refresh();status.textContent='Sampling '+requested.width+'×'+requested.height+' surface voxels…';
  try{
   const response=await fetch('/api/tomo-edit-probe',{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':requestId(),'Content-Type':'application/json'},body:JSON.stringify({job,support,source:document.querySelector('#source').value,poleAxis:pole(),width:requested.width})});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   if(key()!==snapshot){status.textContent='Sphere/source/projection changed — press Update.';return;}
   const finite=result.values.filter(Number.isFinite).sort((a,b)=>a-b);
   const lo=finite[Math.floor(finite.length*.02)]??0,hi=finite[Math.min(finite.length-1,Math.floor(finite.length*.98))]??lo;
   canvas.width=result.width;canvas.height=result.height;canvas.style.aspectRatio=String(result.width/result.height);
   const ctx=canvas.getContext('2d'),img=ctx.createImageData(result.width,result.height);
   result.values.forEach((v,i)=>{const p=i*4,c=hi>lo?Math.round(255*Math.max(0,Math.min(1,(v-lo)/(hi-lo)))):128;
    img.data[p]=v===null?255:c;img.data[p+1]=v===null?0:c;img.data[p+2]=v===null?255:c;img.data[p+3]=255;
   });base=img;raw=result;stamp=snapshot;paint();
   const deg=x=>{const n=((x*360-180+180)%360+360)%360-180;return Math.round(n)+'°';};
   const ticks=panel.querySelector('.probe-ticks');ticks.replaceChildren();
   for(const x of [0,.25,.5,.75,1]){const label=document.createElement('span');label.textContent=deg(probeLongitude(x,result));ticks.append(label);}
   const lat=y=>(Math.asin(Math.max(-1,Math.min(1,1-2*probeLatitude(y,result))))*180/Math.PI).toFixed(1)+'°';
   panel.querySelector('small').textContent='Longitude → (wraps at ±180°) · latitude '+lat(1)+' to '+lat(0)+' · poles '+result.poleAxis;
   status.textContent='Sphere #'+support.id+' · R '+support.radius+' Å · '+result.width+'×'+result.height+' samples · grayscale 2–98%'+(result.missing?' · '+result.missing+' invalid (magenta)':'');
  }catch(e){status.textContent='Probe failed: '+e.message;}finally{busy=false;refresh();}
 };
 new ResizeObserver(()=>{if(!panel.hidden)refresh();}).observe(imageBox);
 header.onpointerdown=e=>{
  if(e.button!==0||e.target.closest('button'))return;
  const r=panel.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};
  panel.style.left=r.left+'px';panel.style.top=r.top+'px';panel.style.right='auto';panel.style.bottom='auto';
  header.setPointerCapture(e.pointerId);e.preventDefault();
 };
 header.onpointermove=e=>{if(!drag)return;panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,drag.left+e.clientX-drag.x))+'px';panel.style.top=Math.max(0,Math.min(innerHeight-32,drag.top+e.clientY-drag.y))+'px';};
 header.onpointerup=header.onpointercancel=()=>{drag=null;};
 return {refresh,drawPointer(ctx,item,scale=1){
  if(minimized||!hover||hover.key!==key()||stamp!==key()||panel.hidden)return;
  const guide=sphereSliceGuide(current(),item.geometry,pole(),probeLongitude(hover.x,raw));if(!guide?.end)return;
  const [x,y]=guide.start,[u,v]=guide.end,angle=Math.atan2(v-y,u-x),head=7/scale;
  if(Math.hypot(u-x,v-y)<1/scale)return;
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=2/scale;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(u,v);
  for(const offset of [-.5,.5]){ctx.moveTo(u,v);ctx.lineTo(u-head*Math.cos(angle+offset),v-head*Math.sin(angle+offset));}ctx.stroke();ctx.restore();
 }};

}
