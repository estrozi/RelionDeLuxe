import {createSphereProbe} from './sphere-probe.js';
import {createTomoEditor} from './tomo-editor.js';
import {SliceCache} from './slice-cache.js';
import {projectedTomogramPicks} from './tomogram-coordinates.js';
import {tomogramColumns,tomogramDisplaySize,supportCenterSlice} from './tomo-view.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.hash.slice(1));
const token=params.get('token')||sessionStorage.getItem('relion-token')||'';
if(token)sessionStorage.setItem('relion-token',token);
params.delete('token');history.replaceState(null,'',location.pathname+'#'+params);
document.documentElement.dataset.theme=params.get('theme')||'light';
$('#file').textContent=params.get('file')||'';
let probe=null;let editor=null;let rows=[],item=null,revision=0,timer,prefetchTimer;
async function request(route){
 const response=await fetch('/api/'+route,{headers:{'X-Relion-Token':token}});
 if(!response.ok)throw Error((await response.json()).error||'Request failed');return response;
}
const cache=new SliceCache(async(file,axis,fraction)=>{
 const response=await request('gallery-image?'+new URLSearchParams({file,axis,central:'1',slice:String(fraction),full:'1'}));
 const bytes=await response.arrayBuffer(),view=new DataView(bytes),width=view.getUint32(0,true),height=view.getUint32(4,true),data=new Float32Array(width*height);
 let mean=0,m2=0,count=0;
 for(let i=0;i<data.length;i++){const v=view.getFloat32(8+i*4,true);data[i]=v;count++;const d=v-mean;mean+=d/count;m2+=d*(v-mean);}
 return {data,width,height,mean,sigma:Math.sqrt(m2/count)||1,scale:Number(response.headers.get('X-Image-Scale')),geometry:JSON.parse(response.headers.get('X-Volume-Geometry'))};
},{concurrency:2});
function row(){return rows[Number($('#tomogram').value)];}
function cancel(){clearTimeout(timer);clearTimeout(prefetchTimer);cache.cancelQueued();return ++revision;}
function fit(){
 if(!item)return;const view=$('#viewport'),box=$('#image'),mode=$('#scale').value;
 const size=tomogramDisplaySize(item.width,item.height,view.clientWidth,view.clientHeight,mode);
 box.style.width=size.width+'px';box.style.height=size.height+'px';
 drawCrosses();
}
function drawCrosses(){
 probe?.refresh();
 if(!item)return;
 const box=$('#image'),canvas=$('#overlay'),w=Math.max(1,Math.round(box.getBoundingClientRect().width)),h=Math.max(1,Math.round(box.getBoundingClientRect().height));
 // Overlay coordinates use the same image scale, but crosses stay legible when zoomed out.
 canvas.width=item.width;canvas.height=item.height;
 const ctx=canvas.getContext('2d'),projected=projectedTomogramPicks(item.row,item.geometry,item.scale,Math.max(0,Number($('#depth').value)||0));
 if($('#crosses').checked){ctx.strokeStyle='#00ff00';const scale=w/item.width;ctx.lineWidth=1.5/scale;const radius=4/scale;for(const [i,[x,y]]of projected.points.entries()){const element=Number(projected.groups?.[i]?.element);ctx.strokeStyle=element>0?'hsl('+((element*137.508)%360)+' 90% 60%)':'#00ff00';const px=x*canvas.width/item.width,py=y*canvas.height/item.height;ctx.beginPath();ctx.moveTo(px-radius,py);ctx.lineTo(px+radius,py);ctx.moveTo(px,py-radius);ctx.lineTo(px,py+radius);ctx.stroke();}}
 if(editor){ctx.clearRect(0,0,canvas.width,canvas.height);editor.draw(ctx,item,{crosses:$('#crosses').checked,elements:$('#elements').checked});}
 if($('#elements').checked)probe?.drawPointer(ctx,item,w/item.width);
 $('#info').textContent=item.width+' × '+item.height+' pixels · '+item.geometry.axis+' slice '+(item.geometry.slice+1)+' / '+item.geometry.dimensions[{X:0,Y:1,Z:2}[item.geometry.axis]]+(item.row.tomoPicks?' · '+projected.points.length+' / '+item.row.tomoPicks.length+' picks near slice':'')+(editor?' · Support editing':' · Read-only')+(projected.warning?' · '+projected.warning:'');
}
function draw(){
 if(!item)return;const canvas=$('#density');canvas.width=item.width;canvas.height=item.height;
 const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(item.width,item.height),contrast=Number($('#contrast').value),brightness=Number($('#brightness').value),invert=$('#invert').checked;
 for(let i=0;i<item.data.length;i++){let v=Math.max(0,Math.min(1,.5+(item.data[i]-item.mean)/(2*contrast*item.sigma)+brightness/2));if(invert)v=1-v;const p=i*4;pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=Math.round(v*255);pixels.data[p+3]=255;}
 ctx.putImageData(pixels,0,0);$('#image').style.display='block';fit();
}
async function load(fraction=.5,id=cancel(),focus=null){
 const selected=row(),file=selected?.[$('#source').value],axis=$('#axis').value;
 $('#status').textContent='Loading slice…';
 try{
  let result=await cache.get(file||'',axis,fraction);
  if(id!==revision||!result)return;
  if(focus?.tomogram===selected.rlnTomoName){
   const target=supportCenterSlice(focus,result.geometry,axis),n=result.geometry.dimensions[{X:0,Y:1,Z:2}[axis]];
   if(target!==null&&target!==result.geometry.slice)result=await cache.get(file||'',axis,n>1?target/(n-1):0);
  }
  if(id!==revision||!result)return;
  item={...result,row:selected};const n=result.geometry.dimensions[{X:0,Y:1,Z:2}[axis]];
  $('#slice').max=n-1;$('#slice').value=result.geometry.slice;$('#slice').disabled=n<=1;$('#slice-number').textContent=(result.geometry.slice+1)+' / '+n;
  editor?.refresh();draw();$('#status').textContent=selected.rlnTomoName||file;
  prefetchTimer=setTimeout(()=>{
   if(id!==revision||document.hidden||n<=1)return;
   for(const d of [-1,1,-2,2]){const s=result.geometry.slice+d;if(s>=0&&s<n)cache.get(file,axis,s/(n-1),true).catch(()=>{});}
  },350);
 }catch(error){if(id!==revision)return;$('#status').textContent='Cannot display slice: '+error.message;}
}
function switchVolume(focus=null){
 cancel();item=null;$('#image').style.display='none';$('#slice').disabled=true;$('#slice-number').textContent='—';$('#viewport').scrollTo(0,0);load(.5,revision,focus);
}
$('#tomogram').onchange=()=>switchVolume();$('#source').onchange=()=>switchVolume();
$('#axis').onchange=()=>switchVolume(editor?.selectedSupport());
$('#density').tabIndex=0;
$('#density').addEventListener('pointerdown',()=>$('#density').focus({preventScroll:true}));
document.addEventListener('keydown',e=>{
 if(['ArrowLeft','ArrowRight'].includes(e.key)&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!e.target.closest?.('input,textarea,select,[contenteditable=true]')){
  const slider=$('#slice');if(slider.disabled)return;e.preventDefault();
  const value=Math.max(Number(slider.min)||0,Math.min(Number(slider.max),Number(slider.value)+(e.key==='ArrowRight'?1:-1)));
  if(value!==Number(slider.value)){slider.value=String(value);slider.dispatchEvent(new Event('input'));}return;
 }
 if(e.key!=='Home'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
 const support=editor?.selectedSupport();
 if(support?.type!=='spheres'||support.tomogram!==row()?.rlnTomoName)return;
 e.preventDefault();load(.5,cancel(),support);
});
$('#slice').oninput=()=>{
 const id=cancel(),n=Number($('#slice').max),slice=Number($('#slice').value);
 $('#slice-number').textContent=(slice+1)+' / '+(n+1);
 timer=setTimeout(()=>load(n?slice/n:0,id),60);
};
$('#scale').onchange=fit;
for(const id of ['contrast','brightness','invert'])$('#'+id).oninput=draw;
for(const id of ['crosses','elements','depth'])$('#'+id).oninput=drawCrosses;
new ResizeObserver(fit).observe($('#viewport'));
try{
 const edit=params.get('edit')==='1';const editContext=edit?await (await request('tomo-edit?'+new URLSearchParams({job:params.get('job')||''}))).json():null;
 const manifest=editContext?.manifest||await (await request('gallery?'+new URLSearchParams({file:params.get('file')||'',...(params.has('job')?{job:params.get('job')}:{}),...(params.get('aligned')==='1'?{aligned:'1'}:{})}))).json();
 $('#file').textContent=manifest.file||params.get('file')||'';
 const columns=(manifest.alignedStack?['rlnDeluxeAlignedStack']:tomogramColumns).filter(c=>manifest.imageColumns.includes(c));if(!columns.length)throw Error('This STAR file does not contain reconstructed tomograms.');
 rows=manifest.rows;if(!rows.length)throw Error('No tomograms in this file.');
 rows.forEach((r,i)=>{const o=document.createElement('option');o.value=i;o.textContent=r.rlnTomoName||'Tomogram '+(i+1);$('#tomogram').append(o);});
 for(const c of columns){const o=document.createElement('option');o.value=c;o.textContent=manifest.alignedStack?'Aligned tilt stack':c.includes('Denoised')?'Denoised':c.endsWith('Half1')?'Half 1':c.endsWith('Half2')?'Half 2':'Reconstructed';$('#source').append(o);}
 if(manifest.alignedStack){document.querySelector('header strong').textContent='RelionDeLuxe · Tilt-stack viewer';document.title='Tilt-stack viewer · RelionDeLuxe';$('#tomogram').parentElement.firstChild.textContent='Tilt series ';$('#axis').value='Z';$('#axis').parentElement.hidden=true;$('#info').textContent='Read-only aligned tilt images. Each Z slice is a tilt image, not a reconstructed volume.';}
 $('#pick-controls').hidden=!manifest.particlesFile;
 if(manifest.overlayWarning){$('#warning').hidden=false;$('#warning').textContent=manifest.overlayWarning;}
 if(editContext){$('#elements-control').hidden=false;editor=createTomoEditor({context:editContext,job:params.get('job'),token,getItem:()=>item,onChange:drawCrosses,onSelectSupport:s=>load(.5,cancel(),s),setStatus:s=>$('#status').textContent=s});$('#pick-controls').hidden=false;document.querySelector('header>span').textContent=editContext.writable?'Picking editor':'Read-only';}
 if(editor)probe=createSphereProbe({job:params.get('job'),token,getSupport:()=>editor.selectedSupport(),getItem:()=>item,canRotate:()=>editor.canRotate(),onRotate:(...args)=>editor.rotateSphere(...args),onExclude:indices=>editor.excludeSphere(indices),onMinima:directions=>editor.setSphereParticles(directions),onHover:drawCrosses});
 await load();
}catch(error){$('#status').textContent=error.message;}
