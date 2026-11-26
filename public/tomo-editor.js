import {fitSphere} from './sphere-fit.js';
import {moveSupport,excludeRectangle,supportUndo,fitPointRectangle} from './tomo-edit-actions.js';
import {supportMenu,supportColor} from './support-menu.js';
import {sampleSupports,constrainSupports,rotateSphereSupport,freezeSphereSampling,resampleSphere} from './tomo-supports.js';
import {requestId} from './request-id.js';
export function createTomoEditor({context,job,token,getItem,onChange,setStatus,onSelectSupport=()=>{}}){
 let initialized=false,lastIssues=[];let supports=context.supports||[],revision=context.revision,dirty=false,busy=false,active=null,samples=[];
 let fitting=null;
 const undoHistory=supportUndo(supports);
 const section=document.createElement('section');section.className='controls tomo-edit-controls';
 section.innerHTML='<strong>Picking</strong><label>Type <select id="support-type"><option>particles</option><option>spheres</option><option>filaments</option><option>surfaces</option></select></label><label>Element <button id="support-element" type="button" aria-label="Support element"></button></label><button id="support-new">New element</button><button id="support-delete">Delete element</button><button id="sphere-resample">Resample sphere</button><button id="sphere-clean">Clean sphere</button><button id="fit-sphere-start">Fit sphere start</button><button id="fit-sphere-end">Fit sphere end</button><label>Radius (Å) <input id="support-radius" type="number" min=".1" value="200" step="1"></label><label>Spacing (Å) <input id="support-spacing" type="number" min=".1" value="60" step="1"></label><label><input id="support-flip" type="checkbox"> Flip surface normals</label><label>Step (Å) <input id="support-step" type="number" min=".1" step=".1" value="10"></label><span class="support-arrows" role="group" aria-label="Move support in displayed plane"><button id="support-left" title="Move support left by one step" aria-label="Move support left">←</button><button id="support-up" title="Move support up by one step" aria-label="Move support up">↑</button><button id="support-down" title="Move support down by one step" aria-label="Move support down">↓</button><button id="support-right" title="Move support right by one step" aria-label="Move support right">→</button></span><label>Search ± (Å) <input id="optm-range" type="number" min=".1" max="1000" step="1" value="20"></label><button id="optm-x">Optm X</button><button id="optm-y">Optm Y</button><button id="optm-z">Optm Z</button><button id="optm-r">Optm R</button><button id="optm-undo" title="Undo the most recent edit">Undo</button><button id="support-save">Save annotations</button><button id="support-finish">Save and finish job</button><span id="support-help"></span>';
 document.querySelector('#status').before(section);
 const $=id=>section.querySelector('#'+id),find=()=>supports.find(s=>s.id===active),color=supportColor;
 const elementMenu=supportMenu($('support-element'),choose);
 $('support-type').value=context.defaultType;$('support-spacing').value=context.spacing;
 function changed(){dirty=true;refresh(true);undoHistory.record(supports);onChange();}
 function refresh(recompute=false){
  const selected=find(),tomo=getItem()?.row.rlnTomoName;
  elementMenu.update([{id:'',label:'New / none'},...supports.filter(s=>s.tomogram===tomo).map(s=>({id:String(s.id),label:s.id+' · '+s.type}))],selected?.tomogram===tomo?String(active):'');
  const issues=[];if(recompute||!initialized){samples=[];
  for(const s of supports){try{constrainSupports([s],context.volumeGeometry);samples.push(...sampleSupports([s],{limit:200000-samples.length}));}catch(e){issues.push('#'+s.id+': '+e.message);}}
  lastIssues=issues;initialized=true;}
  const type=$('support-type').value;
  $('support-radius').closest('label').hidden=type!=='spheres';$('support-spacing').closest('label').hidden=type==='particles';$('support-flip').closest('label').hidden=type!=='surfaces';
  $('support-help').textContent=type==='surfaces'?'Draw closed contours with consistent winding on distinct parallel slices. Ends remain open.':type==='filaments'?'Click successive centerline points across slices.':type==='spheres'?'Click the sphere center; set its radius. Use New element for another sphere.':'Click particle centers.';
  $('support-help').textContent+=' Middle-drag removes visible samples inside a rectangle; moving preserves deletions; radius/spacing changes preserve them; Resample sphere explicitly regenerates particles.';
  if(lastIssues.length)$('support-help').textContent+=' Incomplete: '+lastIssues.join('; ');
  section.querySelectorAll('input,select,button').forEach(x=>x.disabled=busy||!context.writable);
  const item=getItem(),valid=selected&&selected.tomogram===item?.row.rlnTomoName;
  for(const a of ['X','Y','Z','R'])$('optm-'+a.toLowerCase()).disabled=busy||!context.writable||!valid||(a==='R'?selected.type!=='spheres':a===item.geometry.axis);
  for(const id of ['sphere-resample','sphere-clean']){$(id).hidden=type!=='spheres';$(id).disabled=busy||!context.writable||!valid||selected.type!=='spheres';}
  $('optm-undo').disabled=busy||!context.writable||!undoHistory.available();
  $('support-save').disabled=busy||!context.writable;
  $('support-finish').disabled=busy||!context.writable||!samples.length||!!lastIssues.length;
  $('support-save').textContent=dirty?'Save annotations *':'Save annotations';
  if(fitting){section.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);$('fit-sphere-start').disabled=false;$('optm-undo').disabled=!fitting.points.length;$('support-help').textContent=`Fit sphere: ${fitting.points.length} points. Click surface points on different slices/directions. Middle-drag deletes visible fit points; Undo removes the last point; Escape cancels.`;}
  $('fit-sphere-end').disabled=busy||!context.writable||!fitting||fitting.points.length<4;
  $('fit-sphere-start').disabled=busy||!context.writable||!getItem();
  for(const id of ['tomogram','source'])document.querySelector('#'+id).disabled=!!fitting;

 }
 function choose(){
  active=Number($('support-element').value)||null;const s=find();if(s){$('support-type').value=s.type;if(s.radius)$('support-radius').value=s.radius;if(s.spacing)$('support-spacing').value=s.spacing;$('support-flip').checked=!!s.flip;}refresh();onChange();if(s)onSelectSupport(s);
 }

 $('fit-sphere-start').onclick=()=>{
  const item=getItem();if(!item||busy||!context.writable)return;
  if(fitting?.points.length&&!confirm('Discard the current fit points and start again?'))return;
  fitting={tomogram:item.row.rlnTomoName,points:[]};refresh();onChange();setStatus('Click points on the sphere surface across different slices. Escape cancels.');
 };
 $('fit-sphere-end').onclick=()=>{
  if(!fitting||busy||!context.writable)return;
  try{
   const result=fitSphere(fitting.points),spacing=Number($('support-spacing').value);
   const s={id:Math.max(0,...supports.map(s=>s.id))+1,type:'spheres',tomogram:fitting.tomogram,center:result.center,radius:result.radius,spacing};
   constrainSupports([s],context.volumeGeometry);sampleSupports([...supports,s],{limit:200000});freezeSphereSampling(s);
   supports.push(s);active=s.id;fitting=null;$('support-type').value='spheres';$('support-radius').value=s.radius;changed();onSelectSupport(s);
   setStatus(`Sphere fitted: radius ${s.radius.toFixed(2)} Å · RMS surface distance ${result.rms.toFixed(2)} Å. Save annotations to keep it.`);
  }catch(e){setStatus('Sphere not created: '+e.message);}
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&fitting){e.preventDefault();if(fitting.points.length&&!confirm('Discard the current sphere fit points?'))return;fitting=null;refresh();onChange();setStatus('Sphere fit cancelled.');}});
 $('support-new').onclick=()=>{active=null;refresh();onChange();};
 $('support-type').onchange=()=>{active=null;refresh();onChange();};
 $('support-delete').onclick=()=>{if(!find()||!confirm('Delete this support element and all its sampled particles?'))return;supports=supports.filter(s=>s.id!==active);active=null;changed();};
 for(const [id,key]of [['support-radius','radius'],['support-spacing','spacing']])$(id).onchange=()=>{const s=find(),v=Number($(id).value);if(!(v>0)){setStatus('Enter a positive value');return;}if(s&&s[key]!==v){freezeSphereSampling(s);s[key]=v;changed();}};
 for(const id of ['sphere-resample','sphere-clean'])$(id).onclick=()=>{
  const s=find();if(!s||s.type!=='spheres'||busy||!context.writable)return;
  if(!confirm(id==='sphere-clean'?'Remove all particles from this sphere?':'Resample this sphere, replacing its particles and deletions?'))return;
  const before=structuredClone(s);
  try{
   if(id==='sphere-clean'){s.sphereDirections=[];delete s.excludedSamples;}
   else resampleSphere(s);
   changed();
  }catch(e){setStatus(e.message);}
 };
 $('support-flip').onchange=()=>{if(find()){find().flip=$('support-flip').checked;changed();}};
 for(const direction of ['left','up','down','right'])$('support-'+direction).onclick=()=>{
  const s=find(),item=getItem();if(!s||s.tomogram!==item?.row.rlnTomoName)return;
  try{moveSupport(s,item.geometry.axis,direction,Number($('support-step').value));changed();}catch(e){setStatus(e.message);}
 };
 for(const axis of ['X','Y','Z','R'])$('optm-'+axis.toLowerCase()).onclick=async()=>{
  const selected=find(),item=getItem();if(!selected||!item||busy)return;
  const before=structuredClone(selected),snapshot=JSON.stringify(selected),viewAxis=item.geometry.axis,source=document.querySelector('#source').value,invert=!!document.querySelector('#invert').checked;
  busy=true;refresh();setStatus('Optimizing '+axis+' toward darker values at all remaining crosses…');
  try{
   const response=await fetch('/api/tomo-edit-optimize',{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':requestId(),'Content-Type':'application/json'},body:JSON.stringify({job,support:before,axis,viewAxis,source,invert,range:Number($('optm-range').value)})}),result=await response.json();
   if(!response.ok)throw Error(result.error);
   if(find()!==selected||JSON.stringify(selected)!==snapshot||getItem()?.row.rlnTomoName!==item.row.rlnTomoName||getItem()?.geometry.axis!==viewAxis||document.querySelector('#source').value!==source||document.querySelector('#invert').checked!==invert)throw Error('View or support changed; optimization result was not applied.');
   if(result.blocked){
    const outside=result.outsideSamples||[],invalid=result.nonFiniteCount||0;
    if(outside.length&&confirm(outside.length+' particle(s) of support #'+selected.id+' lie outside the tomogram. Delete all of these particles?'+(invalid?' Another '+invalid+' particle(s) lie on non-finite voxels and will not be deleted.':'')+' This affects only the selected support.')){
     selected.excludedSamples=[...new Set([...(selected.excludedSamples||[]),...outside])].sort((a,b)=>a-b);
     
     changed();setStatus('Removed '+outside.length+' out-of-volume particles. '+(invalid?invalid+' particle(s) still lie on non-finite voxels. ':'')+'Retry optimization when ready; Save annotations to keep deletions. Undo restores them.');
    }else setStatus('Optimization not applied: '+(outside.length?outside.length+' out-of-volume particles remain. ':'')+(invalid?invalid+' particle(s) lie on non-finite voxels; inspect/clean these separately.':''));
    return;
   }
   if(result.improved){
    supports=supports.map(s=>s.id===selected.id?result.support:s);
    
    if(axis==='R')$('support-radius').value=result.support.radius;
    changed();
   }
   setStatus((result.improved?'Optimized '+axis+' by '+result.delta.toFixed(3)+' Å':'No improvement found')+' · contrast-adjusted mean '+result.before.toPrecision(6)+' → '+result.score.toPrecision(6)+(result.atBoundary?' · Search boundary reached.':'')+' · '+result.count+' usable particles'+(result.ignoredOutside?' · '+result.ignoredOutside+' outside-volume particles ignored':'')+' · Save annotations to keep changes.');
  }catch(e){setStatus('Optimization not applied: '+e.message);}finally{busy=false;refresh();}
 };
 $('optm-undo').onclick=()=>{
  if(fitting){fitting.points.pop();refresh();onChange();return;}
  if(busy||!context.writable)return;const previous=undoHistory.take();if(!previous)return;
  supports=previous;if(!find())active=supports.at(-1)?.id??null;
  const s=find();if(s){$('support-type').value=s.type;if(s.radius)$('support-radius').value=s.radius;if(s.spacing)$('support-spacing').value=s.spacing;$('support-flip').checked=!!s.flip;}
  dirty=true;refresh(true);onChange();setStatus('Last edit undone. Save annotations to keep this change.');
 };
 async function save(finish){
  if(busy)return;busy=true;refresh();setStatus('Saving annotations…');
  try{
   const r=await fetch('/api/tomo-edit-'+(finish?'finish':'save'),{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':requestId(),'Content-Type':'application/json'},body:JSON.stringify({job,revision,supports})}),result=await r.json();if(!r.ok)throw Error(result.error);
   revision=result.revision;dirty=false;if(finish){context.writable=false;section.querySelectorAll('input,select,button').forEach(x=>x.disabled=true);}
   setStatus(finish?'Finished: '+result.count+' particles saved.'+(result.ignoredOutside?' '+result.ignoredOutside+' outside-volume particles omitted.':''):'Annotations saved.');
  }catch(e){setStatus('Could not save: '+e.message);}finally{busy=false;refresh();}
 }
 $('support-save').onclick=()=>save(false);$('support-finish').onclick=()=>save(true);
 const canvas=document.querySelector('#density');
 canvas.addEventListener('click',e=>{
  if(e.button!==0||!context.writable||busy)return;const item=getItem();if(!item)return;
  const g=item.geometry,r=canvas.getBoundingClientRect(),axes={X:[1,2,0],Y:[0,2,1],Z:[0,1,2]}[g.axis],xyz=[0,0,0];
  xyz[axes[0]]=(e.clientX-r.left)/r.width*item.width;xyz[axes[1]]=(e.clientY-r.top)/r.height*item.height;xyz[axes[2]]=g.slice;
  if(g.voxelSize.some(v=>!(v>0))){setStatus('Cannot pick without valid volume voxel spacing');return;}
  const point=xyz.map((v,i)=>(v-g.dimensions[i]/2)*g.voxelSize[i]);
  if(fitting){if(fitting.tomogram!==item.row.rlnTomoName)return;fitting.points.push(point);refresh();onChange();setStatus('Sphere fit: '+fitting.points.length+' points collected.');return;}
  let s=find();if(!s||s.tomogram!==item.row.rlnTomoName||s.type!==$('support-type').value){
   s={id:Math.max(0,...supports.map(x=>x.id))+1,type:$('support-type').value,tomogram:item.row.rlnTomoName,spacing:Number($('support-spacing').value),radius:Number($('support-radius').value),points:[],contours:[],axis:g.axis};supports.push(s);active=s.id;
  }
  if(s.type==='surfaces'&&s.axis!==g.axis){setStatus('Keep one slice direction for all contours of this surface');return;}
  if(s.type!=='spheres')delete s.excludedSamples;
  if(s.type==='spheres'){s.center=point;freezeSphereSampling(s);}
  else if(s.type==='surfaces'){
   if(s.axis!==g.axis){setStatus('Keep one slice direction for all contours of this surface');return;}
   let contour=s.contours.find(c=>Math.abs(c[0][axes[2]]-point[axes[2]])<1e-4);if(!contour){contour=[];s.contours.push(contour);}contour.push(point);
  }else s.points.push(point);
  changed();
 });
 let drag=null;
 const screenPoint=(e,item)=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)/r.width*item.width,(e.clientY-r.top)/r.height*item.height];};
 canvas.addEventListener('mousedown',e=>{if(e.button===1)e.preventDefault();});
 canvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==1||!context.writable||busy||!getItem())return;
  if(fitting){if(fitting.tomogram!==getItem().row.rlnTomoName)return;e.preventDefault();const item=getItem(),point=screenPoint(e,item);drag={item,start:point,end:point,id:e.pointerId,fit:fitting};canvas.setPointerCapture(e.pointerId);onChange();return;}
  if(!find()||find().tomogram!==getItem().row.rlnTomoName)return;if(!document.querySelector('#crosses').checked){e.preventDefault();setStatus('Show Crosses before rectangle cleaning.');return;}e.preventDefault();
  const item=getItem(),point=screenPoint(e,item);drag={item,start:point,end:point,id:e.pointerId,keepOnly:e.shiftKey,activeId:active};canvas.setPointerCapture(e.pointerId);onChange();
 });
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();drag.end=screenPoint(e,drag.item);onChange();});
 canvas.addEventListener('pointerup',e=>{
  if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const box=drag;drag=null;
  if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  if(box.fit){
   if(box.fit!==fitting||box.item!==getItem()){onChange();setStatus('Rectangle cancelled because the displayed slice changed.');return;}
   const indices=new Set(fitPointRectangle(fitting.points,box.item,box.start,screenPoint(e,box.item),Math.max(0,Number(document.querySelector('#depth').value)||0)));
   fitting.points=fitting.points.filter((_,i)=>!indices.has(i));refresh();onChange();setStatus(indices.size+' fit points removed; '+fitting.points.length+' remain.');return;
  }
  if(box.item===getItem()&&box.activeId===active&&document.querySelector('#crosses').checked){
   const end=screenPoint(e,box.item),depth=Math.max(0,Number(document.querySelector('#depth').value)||0);
   if(box.keepOnly){
    const plan=excludeRectangle(supports,samples,box.item,box.start,end,depth,{preview:true,activeId:box.activeId});
    if(!confirm('Are you sure you want to keep/delete '+plan.keep+'/'+plan.remove+' particles? Only the active support’s particles in the current slice/depth window are affected.')){onChange();return;}
   }
   const count=excludeRectangle(supports,samples,box.item,box.start,end,depth,{keepOnly:box.keepOnly,activeId:box.activeId});
   if(count)changed();else onChange();setStatus(count+' particles removed. Save annotations to keep this change.');
  }else{onChange();setStatus('Rectangle cancelled because the displayed slice changed.');}
 });
 const cancelDrag=()=>{drag=null;onChange();};
 canvas.addEventListener('pointercancel',cancelDrag);
 canvas.addEventListener('lostpointercapture',()=>{if(drag)cancelDrag();});
 window.addEventListener('beforeunload',e=>{if(dirty||fitting?.points.length){e.preventDefault();e.returnValue='';}});
 refresh();
 return {
  selectedSupport:()=>find(),
  setSphereParticles:directions=>{
   const s=find();if(!context.writable||busy||s?.type!=='spheres')return;
   const before=structuredClone(s);s.sphereDirections=directions;delete s.sphereRotation;delete s.excludedSamples;
   changed();
   setStatus(directions.length+' projection-extremum particles placed. Save annotations to keep them; Undo restores previous particles.');
  },
  excludeSphere:(indices)=>{
   const s=find();if(!context.writable||busy||s?.type!=='spheres')return;
   const before=structuredClone(s);s.excludedSamples=[...new Set([...(s.excludedSamples||[]),...indices])].sort((a,b)=>a-b);
   changed();
   setStatus(indices.length+' particles removed from sphere. Save annotations to keep changes; Undo restores them.');
  },
  canRotate:()=>context.writable&&!busy,
  rotateSphere:(pole,direction,degrees)=>{
   const s=find();if(!context.writable||busy||s?.type!=='spheres'||s.tomogram!==getItem()?.row.rlnTomoName)return;
   const before=structuredClone(s);rotateSphereSupport(s,pole,direction,degrees);
   changed();
   setStatus('Sphere particles rotated rigidly. Save annotations to keep changes; Undo restores the previous orientation.');
  },
  refresh,
  draw(ctx,item,{crosses=true,elements=true}={}){
   if(drag&&drag.item===item){const scale=canvas.getBoundingClientRect().width/item.width;ctx.save();ctx.strokeStyle='#ff5050';ctx.fillStyle='#ff505025';ctx.lineWidth=1.5/scale;ctx.setLineDash([6/scale,3/scale]);const [x,y]=drag.start,w=drag.end[0]-x,h=drag.end[1]-y;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.restore();}
   const g=item.geometry,axes={X:[1,2,0],Y:[0,2,1],Z:[0,1,2]}[g.axis],depth=Math.max(0,Number(document.querySelector('#depth').value)||0);
   const project=p=>{const v=p.map((x,i)=>x/g.voxelSize[i]+g.dimensions[i]/2);return Math.abs(v[axes[2]]-g.slice)<=depth?[v[axes[0]],v[axes[1]]]:null;};
   const scale=canvas.getBoundingClientRect().width/item.width,radius=4/scale;
   if(fitting?.tomogram===item.row.rlnTomoName){ctx.save();ctx.strokeStyle='#ff2020';ctx.lineWidth=3/scale;for(const p of fitting.points){const xy=project(p);if(!xy)continue;ctx.beginPath();ctx.moveTo(xy[0]-radius,xy[1]-radius);ctx.lineTo(xy[0]+radius,xy[1]+radius);ctx.moveTo(xy[0]-radius,xy[1]+radius);ctx.lineTo(xy[0]+radius,xy[1]-radius);ctx.stroke();}ctx.restore();}
   ctx.lineWidth=1.5/scale;
   if(crosses)for(const p of samples.filter(p=>p.tomogram===item.row.rlnTomoName)){const xy=project(p.position);if(!xy)continue;ctx.strokeStyle=color(p.element);ctx.beginPath();ctx.moveTo(xy[0]-radius,xy[1]);ctx.lineTo(xy[0]+radius,xy[1]);ctx.moveTo(xy[0],xy[1]-radius);ctx.lineTo(xy[0],xy[1]+radius);ctx.stroke();}
   if(elements)for(const s of supports.filter(s=>s.tomogram===item.row.rlnTomoName)){
    ctx.strokeStyle=s.id===active?'#fff':color(s.id);
    const paths=s.center?[[s.center]]:s.contours?.length?s.contours:s.points?[s.points]:[];
    for(const points of paths){
     const projected=points.map(project);ctx.beginPath();let pen=false;
     for(const xy of projected){if(!xy){pen=false;continue;}if(pen)ctx.lineTo(...xy);else ctx.moveTo(...xy);pen=true;}
     if(s.type==='surfaces'&&projected.every(Boolean)&&projected.length>2)ctx.closePath();ctx.stroke();
     for(const xy of projected){if(xy)ctx.strokeRect(xy[0]-radius,xy[1]-radius,2*radius,2*radius);}
    }
    if(s.type==='spheres'&&s.center){const center=s.center.map((v,i)=>v/g.voxelSize[i]+g.dimensions[i]/2),d=(center[axes[2]]-g.slice)*g.voxelSize[axes[2]];if(Math.abs(d)<=s.radius){const r=Math.sqrt(s.radius*s.radius-d*d);ctx.beginPath();ctx.ellipse(center[axes[0]],center[axes[1]],r/g.voxelSize[axes[0]],r/g.voxelSize[axes[1]],0,0,2*Math.PI);ctx.stroke();}}
   }
  }
 };
}
