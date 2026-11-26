import {tomogramColumns} from './tomo-view.js';
import {SliceCache} from './slice-cache.js';
import {projectedTomogramPicks} from './tomogram-coordinates.js';
import {compareGalleryRows} from './input-sort.js';
import {requestId} from './request-id.js';
if(new URLSearchParams(location.hash.slice(1)).has('screening')){await import('./screening-gallery.js');}else{
const $=s=>document.querySelector(s),params=new URLSearchParams(location.hash.slice(1));
const file=params.get('file')||'',token=params.get('token')||sessionStorage.getItem('relion-token')||'';if(token)sessionStorage.setItem('relion-token',token);params.delete('token');history.replaceState(null,'',location.pathname+'#'+params);document.documentElement.dataset.theme=params.get('theme')||'light';$('#file').textContent=file;
let memberSource=null;let rows=[],page=0,generation=0,images=[];const selectionJob=params.get('selection');let selectionInfo,chosen=new Set(),pageRows=[],saving=false;
function selectionUI(){document.querySelectorAll('figure[data-index]').forEach(f=>{const yes=chosen.has(Number(f.dataset.index));f.classList.toggle('selected',yes);f.setAttribute('aria-pressed',String(yes));});$('#selection-count').textContent=chosen.size+' selected';$('#save-selection').disabled=saving||!selectionInfo?.writable||!chosen.size;try{localStorage.setItem('selection:'+selectionJob,JSON.stringify({revision:selectionInfo?.revision,indices:[...chosen]}));}catch{}}
const status=s=>$('#status').textContent=s;
async function request(route){const r=await fetch('/api/'+route,{headers:{'X-Relion-Token':token}});if(!r.ok)throw Error((await r.json()).error||'Request failed');return r;}
const volumeColumns=new Set(['rlnReferenceImage','rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2']);
const sliceCache=new SliceCache(async(file,axis,fraction)=>{
 const r=await request('gallery-image?'+new URLSearchParams({file,...(axis?{central:'1',axis,slice:String(fraction)}:{})}));
 const bytes=await r.arrayBuffer(),view=new DataView(bytes),width=view.getUint32(0,true),height=view.getUint32(4,true),data=new Float32Array(width*height);
 for(let i=0;i<data.length;i++)data[i]=view.getFloat32(8+4*i,true);
 return {width,height,data,scale:Number(r.headers.get('X-Image-Scale')),geometry:JSON.parse(r.headers.get('X-Volume-Geometry')||'null')};
});
let tiles=[],prefetchTimer;
async function loadTiles(revision){
 clearTimeout(prefetchTimer);sliceCache.cancelQueued();
 const source=$('#image-source').value,axis=volumeColumns.has(source)?$('#slice-axis').value:'',fraction=Number($('#slice-position').value)/1000;
 let cursor=0,errors=0;status('Loading slices…');
 await Promise.all(Array.from({length:4},async()=>{
  while(cursor<tiles.length&&revision===generation){
   const item=tiles[cursor++];
   try{
    const result=await sliceCache.get(item.row[source]||'',axis,fraction);
    if(revision!==generation)return;
    Object.assign(item,result);item.canvas.width=item.width;item.canvas.height=item.height;
    if(!images.includes(item))images.push(item);draw(item);
   }catch(e){if(revision!==generation)return;errors++;item.caption.textContent=e.message;}
  }
 }));
 if(revision!==generation)return;
 status(errors?errors+' images could not be displayed; see their captions.':'Ready. Nearby slices are cached for smoother navigation.');
 if(axis)prefetchTimer=setTimeout(()=>{
  if(revision!==generation||document.hidden)return;
  // Restrict speculative I/O to visible tiles, one request at a time.
  const visible=tiles.filter(t=>{const r=t.canvas.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;}).slice(0,8);
  for(const item of visible){
   const g=item.geometry;if(!g||g.axis!==axis)continue;
   const n=g.dimensions[{X:0,Y:1,Z:2}[axis]];
   if(n<=1)continue;
   for(const delta of [-1,1,-2,2]){
    const slice=g.slice+delta;if(slice<0||slice>=n)continue;
    sliceCache.get(item.row[source],axis,slice/(n-1),true).catch(()=>{});
   }
  }
 },350);
}
function refreshSlices(){clearTimeout(sliceTimer);loadTiles(++generation);}
function draw(item){const {canvas,data,width,height,row,scale}=item,ctx=canvas.getContext('2d');let sum=0;for(const v of data)sum+=v;const mean=sum/data.length;let variance=0;for(const v of data)variance+=(v-mean)**2;const sigma=Math.sqrt(variance/data.length)||1,contrast=Number($('#contrast').value),brightness=Number($('#brightness').value),pixels=ctx.createImageData(width,height);
 for(let i=0;i<data.length;i++){let v=Math.max(0,Math.min(1,0.5+(data[i]-mean)/(2*contrast*sigma)+brightness/2));if($('#invert').checked)v=1-v;const p=i*4,palette=$('#palette').value;pixels.data[p]=255*(palette==='blue'?v*0.35:palette==='heat'?Math.min(1,3*v):v);pixels.data[p+1]=255*(palette==='heat'?Math.max(0,Math.min(1,3*v-1)):palette==='blue'?v*0.8:v);pixels.data[p+2]=255*(palette==='heat'?Math.max(0,3*v-2):v);pixels.data[p+3]=255;}
 const off=document.createElement('canvas');off.width=width;off.height=height;off.getContext('2d').putImageData(pixels,0,0);ctx.resetTransform();ctx.fillStyle='black';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(Math.floor(width/2),Math.floor(height/2));
 if($('#orient').checked){const psi=Number(row.rlnAnglePsi)||0;ctx.rotate(psi*Math.PI/180);let x=Number(row.rlnOriginX)||0,y=Number(row.rlnOriginY)||0;if(row.pixelSize){if(row.rlnOriginXAngst!==undefined)x=(Number(row.rlnOriginXAngst)||0)/row.pixelSize;if(row.rlnOriginYAngst!==undefined)y=(Number(row.rlnOriginYAngst)||0)/row.pixelSize;}ctx.translate(x*scale,y*scale);}
 ctx.drawImage(off,-Math.floor(width/2),-Math.floor(height/2));ctx.restore();
 item.overlayCaption='';
 if($('#show-crosses').checked&&item.geometry){
  const overlay=projectedTomogramPicks(row,item.geometry,scale,Math.max(0,Number($('#cross-depth').value)||0));
  ctx.strokeStyle='#00ff00';ctx.lineWidth=1.5;
  for(const [x,y]of overlay.points){ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();}
  item.overlayCaption=overlay.warning|| (row.tomoPicks?overlay.points.length+' / '+row.tomoPicks.length+' picks near slice':'');
 }
 const key=$('#label').value;item.caption.textContent=key==='NumberOfParticles'?'NumberOfParticles: '+(row.NumberOfParticles??'—'):key==='index'?'Image '+(row.index+1):key+': '+(row[key]??'—');
 if(item.geometry&&!$('#slice-direction').hidden)item.caption.textContent+=' · '+item.geometry.axis+' slice '+(item.geometry.slice+1)+' / '+item.geometry.dimensions[{X:0,Y:1,Z:2}[item.geometry.axis]]+(item.overlayCaption?' · '+item.overlayCaption:'');
 }
async function render(){clearTimeout(sliceTimer);$('#slice-direction').hidden=!(['rlnReferenceImage','rlnTomoReconstructedTomogramDenoised','rlnTomoDenoisedTomogram','rlnTomoReconstructedTomogram','rlnTomoReconstructedTomogramHalf1','rlnTomoReconstructedTomogramHalf2'].includes($('#image-source').value)&&rows.some(r=>r[$('#image-source').value]&&!/^\d+@/.test(r[$('#image-source').value])));$('#slice-position-control').hidden=$('#slice-direction').hidden;
 $('#cross-control').hidden=!rows.some(r=>r.tomoPicks);
 const revision=++generation;images=[];$('#gallery').replaceChildren();const key=$('#sort').value,ordered=[...rows].sort((a,b)=>compareGalleryRows(a,b,key,$('#descending').checked));const total=Math.max(1,Math.ceil(rows.length/64));page=Math.min(page,total-1);$('#page').textContent=`${page+1} / ${total} · ${rows.length} images`;$('#prev').disabled=page===0;$('#next').disabled=page>=total-1;
 pageRows=ordered.slice(page*64,page*64+64);const queue=pageRows.map(row=>{const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');caption.textContent='Loading image '+(row.index+1);figure.title=Object.entries(row).map(([k,v])=>k+': '+v).join('\n');figure.append(canvas,caption);
if(memberSource){const members=document.createElement('a');members.className='class-members';members.textContent='members';members.target='_blank';members.rel='noopener noreferrer';const classNumber=Number(row.rlnClassNumber)||row.index+1;members.title='Show particles in class '+classNumber;members.href='/gallery.html#'+new URLSearchParams({file:memberSource,class:String(classNumber),token,theme:document.documentElement.dataset.theme||'light'});members.onclick=e=>e.stopPropagation();members.onkeydown=e=>e.stopPropagation();figure.append(members);}
if(selectionJob){figure.dataset.index=row.index;figure.classList.add('selectable');figure.tabIndex=0;figure.setAttribute('role','button');figure.setAttribute('aria-label','Select image '+(row.index+1));const toggle=()=>{if(saving||!selectionInfo?.writable)return;if(chosen.has(row.index))chosen.delete(row.index);else chosen.add(row.index);selectionUI();};figure.onclick=toggle;figure.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle();}};}$('#gallery').append(figure);return {row,canvas,caption};});
 tiles=queue;if(selectionJob)selectionUI();await loadTiles(revision);}

for(const id of ['contrast','brightness','palette','invert','orient','label'])$('#'+id).oninput=()=>images.forEach(draw);
$('#slice-axis').onchange=()=>refreshSlices();
 let sliceTimer;
 $('#slice-position').oninput=()=>{clearTimeout(sliceTimer);$('#slice-position-value').textContent=(Number($('#slice-position').value)/10).toFixed(1)+'%';++generation;clearTimeout(prefetchTimer);sliceCache.cancelQueued();sliceTimer=setTimeout(refreshSlices,60);};
 for(const id of ['show-crosses','cross-depth'])$('#'+id).oninput=()=>images.forEach(draw);
$('#image-source').onchange=()=>{page=0;$('#orient').checked=false;render();};
$('#size').oninput=()=>document.documentElement.style.setProperty('--tile',$('#size').value+'px');for(const id of ['sort','descending'])$('#'+id).onchange=()=>{page=0;render();};$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};
$('#native').onclick=async()=>{try{if(!confirm('Open the native RELION viewer on the server workstation?'))return;const r=await fetch('/api/display',{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':requestId(),'Content-Type':'application/json'},body:JSON.stringify({file,job:params.get('job')})});const body=await r.json();if(!r.ok)throw Error(body.error);status('Native viewer requested on the workstation.');}catch(e){status(e.message);}};
$('#select-page').onclick=()=>{if(saving||!selectionInfo?.writable)return;pageRows.forEach(row=>chosen.add(row.index));selectionUI();};$('#clear-selection').onclick=()=>{if(saving||!selectionInfo?.writable)return;chosen.clear();selectionUI();};
$('#save-selection').onclick=async()=>{if(saving||!selectionInfo?.writable||!chosen.size)return;saving=true;selectionUI();try{const response=await fetch('/api/selection-save',{method:'POST',headers:{'X-Relion-Token':token,'X-Request-ID':requestId(),'Content-Type':'application/json'},body:JSON.stringify({job:selectionJob,revision:selectionInfo.revision,indices:[...chosen]})});const result=await response.json();if(!response.ok)throw Error(result.error);selectionInfo.writable=false;status('Saved '+result.count+' rows. '+result.name+' is finished.');}catch(e){status('Selection not completed: '+e.message);}finally{saving=false;selectionUI();}};
try{let manifest;if(selectionJob){selectionInfo=await (await request('selection?job='+encodeURIComponent(selectionJob))).json();manifest=selectionInfo.manifest;$('#file').textContent=selectionJob+' · '+selectionInfo.file;$('#selection-controls').hidden=false;document.querySelector('.note').textContent='Selection mode: Save writes the subset STAR outputs for this job. Display settings do not alter the image data.';$('#native').hidden=true;$('#save-selection').textContent='Save selected '+selectionInfo.mode;try{const saved=JSON.parse(localStorage.getItem('selection:'+selectionJob));if(saved?.revision===selectionInfo.revision)chosen=new Set(saved.indices);}catch{}}else manifest=await (await request('gallery?'+new URLSearchParams({file,...(params.has('job')?{job:params.get('job')}:{}),...(params.has('class')?{class:params.get('class')}:{})}))).json();if(!selectionJob&&manifest.imageColumns.some(c=>tomogramColumns.includes(c))){location.replace('/tomo_pick.html#'+new URLSearchParams({...Object.fromEntries(params),token}));}else{if(manifest.particlesFile){$('#orient').checked=false;$('#orient').disabled=true;document.querySelector('.note').textContent='Tomogram slices with read-only particle crosses from '+manifest.particlesFile+'. Slice position is relative to each volume; ± slices controls the depth shown. No coordinates are changed.';}if(manifest.overlayWarning)document.querySelector('.note').textContent+=' '+manifest.overlayWarning;memberSource=manifest.memberSource||null;rows=manifest.rows;if(manifest.memberClass){$('#file').textContent=file+' · class '+manifest.memberClass+' members';$('#native').hidden=true;}if(manifest.particleCountWarning)document.querySelector('.note').textContent+=' '+manifest.particleCountWarning;if(rows.some(r=>r[$('#image-source').value]&&!/^\d+@/.test(r[$('#image-source').value])))document.querySelector('.note').textContent+=' 3D references are displayed as central slices (X, Y or Z); selecting a tile selects that class and its particles.';for(const key of manifest.imageColumns){const option=document.createElement('option');option.value=key;option.textContent=({rlnCtfImage:'CTF diagnostic images',rlnCtfPowerSpectrum:'Power spectra',rlnMicrographName:'Micrographs',rlnTomoReconstructedTomogramDenoised:'Denoised tomograms',rlnTomoDenoisedTomogram:'Denoised tomograms',rlnTomoReconstructedTomogram:'Original reconstructed tomograms',rlnTomoReconstructedTomogramHalf1:'Reconstructed tomograms — half 1',rlnTomoReconstructedTomogramHalf2:'Reconstructed tomograms — half 2',rlnTomogramProjection:'Tomogram projections',rlnTomogramProjectionHalf1:'Tomogram projections — half 1',rlnTomogramProjectionHalf2:'Tomogram projections — half 2',rlnTomogramHProjectionalf2:'Tomogram projections — half 2',rlnReferenceImage:'Class references',rlnImageName:'Particle images'})[key]||key;$('#image-source').append(option);}if(rows.some(r=>(r.rlnOriginXAngst!==undefined||r.rlnOriginYAngst!==undefined)&&!r.pixelSize)){$('#orient').disabled=true;$('#orient').parentElement.title='Orientation unavailable: Angstrom offsets require pixel-size metadata.';}for(const key of manifest.labels)for(const id of ['sort','label']){const option=document.createElement('option');option.value=key;option.textContent=key;$('#'+id).append(option);}if(manifest.labels.includes('NumberOfParticles')){$('#sort').value='NumberOfParticles';$('#descending').checked=true;$('#label').value='NumberOfParticles';}await render();}}catch(e){status(e.message);}

}
