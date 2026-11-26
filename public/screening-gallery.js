import {requestId} from './request-id.js';
import {toggleScreeningSelection,screeningCandidates} from './screening-selection.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.hash.slice(1));
const job=params.get('screening'),token=params.get('token')||sessionStorage.getItem('relion-token')||'';
if(token)sessionStorage.setItem('relion-token',token);
params.delete('token');history.replaceState(null,'',location.pathname+'#'+params);
document.documentElement.dataset.theme=params.get('theme')||'light';
document.title='Screening · '+job;
document.body.classList.add('screening-gallery');
$('h1').textContent='RelionDeLuxe · Screening';
$('#file').textContent=job;
$('.note').textContent='Select good images by clicking their previews. Shift-click selects a range (including across pages). Save starts copying the selected full-size files into Movies or Micrographs, determined automatically.';
$('#selection-controls p').textContent='Selections span all pages. Red borders mark selected images. Continue rescans the collection; previously copied files and same-size manual copies matching this collection are permanently deleted from the output folder when deselected and saved. Source files are never deleted. Closing this tab leaves the job available to resume.';
for(const id of ['image-source','label','contrast','brightness','palette','invert','orient'])$('#'+id).closest('label').hidden=true;
$('#native').hidden=true;$('#slice-direction').hidden=true;$('#selection-controls').hidden=false;
$('#save-selection').textContent='Save selection & sync files';
const controls=$('#selection-controls'),makeButton=(text,id)=>{const b=document.createElement('button');b.textContent=text;b.id=id;controls.insertBefore(b,$('#clear-selection'));return b;};
const all=makeButton('Select all','select-all'),invert=makeButton('Invert selection','invert-selection');
const download=makeButton('Download copy script','download-script');download.hidden=true;
// One compact, wrapping toolbar; longer guidance is available on demand.
const help=document.createElement('details'),summary=document.createElement('summary');
help.className='screening-help';summary.textContent='Help';
help.append(summary,$('.note'),$('#selection-controls p'));$('header').append(help);
const toolbar=$('.controls');toolbar.append(controls);
const excludedNotice=document.createElement('span');excludedNotice.id='screening-excluded';excludedNotice.hidden=true;controls.append(excludedNotice);
const sort=document.createElement('option');sort.value='relative';sort.textContent='Collection path';$('#sort').append(sort);
let info,chosen=new Set(),page=0,ordered=[],pageRows=[],anchor=null,saving=false,generation=0;
const status=text=>$('#status').textContent=text;
async function request(route,body){
 const response=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'X-Relion-Token':token,...(body?{'Content-Type':'application/json','X-Request-ID':requestId()}: {})},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok)throw Error((await response.json()).error||'Request failed');return response;
}
const route=name=>name+'?job='+encodeURIComponent(job);
function updateSelection(){
 for(const figure of document.querySelectorAll('figure[data-index]')){const yes=chosen.has(Number(figure.dataset.index));figure.classList.toggle('selected',yes);figure.setAttribute('aria-pressed',String(yes));}
 $('#selection-count').textContent=chosen.size+' / '+(info?.rows.length||0)+' selected';
 for(const b of [all,invert,$('#select-page'),$('#clear-selection'),$('#save-selection')])b.disabled=saving||!info?.writable||(b.id==='save-selection'&&(!chosen.size&&!(info?.continuation&&info?.previousFolder)));
 if(info)try{localStorage.setItem('screening:'+info.revision,JSON.stringify([...chosen]));}catch{}
}
function toggle(index,event){
 if(saving||!info?.writable)return;
 ({chosen,anchor}=toggleScreeningSelection(chosen,ordered.map(r=>r.index),index,anchor,event.shiftKey));
 updateSelection();
}
async function render(){
 if(!info)return;
 const rev=++generation;$('#gallery').replaceChildren();
 const key=$('#sort').value;ordered=[...info.rows].sort((a,b)=>{const n=key==='relative'?a.relative.localeCompare(b.relative):a.index-b.index;return $('#descending').checked?-n:n;});
 const pages=Math.max(1,Math.ceil(ordered.length/64));page=Math.max(0,Math.min(page,pages-1));pageRows=ordered.slice(page*64,page*64+64);
 $('#page').textContent=(page+1)+' / '+pages+' · '+ordered.length+' previews';$('#prev').disabled=!page;$('#next').disabled=page>=pages-1;
 const queue=pageRows.map(row=>{
  const figure=document.createElement('figure'),canvas=document.createElement('canvas');
  figure.className='selectable';figure.dataset.index=row.index;figure.tabIndex=0;figure.setAttribute('role','button');figure.setAttribute('aria-label','Select '+row.relative);
  figure.title=row.relative+(row.error?'\n'+row.error:'\n'+row.source);
  figure.append(canvas);figure.onclick=e=>toggle(row.index,e);figure.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();toggle(row.index,e);}};
  $('#gallery').append(figure);return {row,canvas,figure};
 });updateSelection();
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(cursor<queue.length&&rev===generation){
   const {row,canvas,figure}=queue[cursor++];let bitmap;
   try{const response=await request(route('screening-image')+'&index='+row.index);bitmap=await createImageBitmap(await response.blob());if(rev!==generation)continue;
    const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
   }catch(e){if(rev===generation){figure.title=row.relative+' · Preview unavailable: '+e.message;figure.setAttribute('aria-label',figure.title);figure.classList.add('preview-unavailable');}}finally{bitmap?.close();}
  }
 }));
}
$('#size').oninput=()=>document.documentElement.style.setProperty('--tile',$('#size').value+'px');
$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};
for(const id of ['sort','descending'])$('#'+id).onchange=()=>{page=0;anchor=null;render();};
all.onclick=()=>{if(!info?.writable||saving)return;chosen=new Set(info.rows.map(r=>r.index));updateSelection();};
invert.onclick=()=>{if(!info?.writable||saving)return;chosen=new Set(info.rows.filter(r=>!chosen.has(r.index)).map(r=>r.index));anchor=null;updateSelection();};
$('#select-page').onclick=()=>{if(!info?.writable||saving)return;pageRows.forEach(r=>chosen.add(r.index));updateSelection();};
$('#clear-selection').onclick=()=>{if(!info?.writable||saving)return;chosen.clear();anchor=null;updateSelection();};
download.onclick=async()=>{try{const response=await request(route('screening-script')),url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='copy_selected.sh';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status(e.message);}};
$('#save-selection').onclick=async()=>{
 if(saving||!info?.writable||(!chosen.size&&!(info?.continuation&&info?.previousFolder)))return;saving=true;updateSelection();
 try{const result=await (await request('screening-save',{job,revision:info.revision,indices:[...chosen]})).json();info.writable=false;download.hidden=true;
 status('Selection saved. Checking frames and copying '+result.count+' files…');setTimeout(pollCopy,1000);
 }catch(e){status('Selection not saved: '+e.message);}finally{saving=false;updateSelection();}
};
async function pollCopy(){
 try{const result=await (await request(route('screening'))).json();
 status(result.progress?.message||'Copying selected files…');
 if(result.copied){status('Finished: '+(result.copied.copied??result.copied.count)+' new files copied, '+(result.copied.reused||0)+' already present, '+(result.copied.deleted||0)+' deselected files deleted in '+result.copied.folder+'/. '+(result.copied.gains?.length||0)+' gain reference(s) prepared. Ready for Import.');return;}
 if(result.status==='Running')setTimeout(pollCopy,1500);
 else status((result.progress?.message||'Copy stopped')+' · '+result.status);
 }catch(e){status(e.message);}
}
async function load(){
 updateSelection();
 try{
  const result=await (await request(route('screening'))).json();
  if(result.pending){status(result.message);if(['Running','Scheduled'].includes(result.status))setTimeout(load,1500);else status(result.message+' · Job '+result.status);return;}
  let indices=result.saved?.indices||result.initialSelection||[];
  if(!result.saved)try{const saved=JSON.parse(localStorage.getItem('screening:'+result.revision));if(Array.isArray(saved))indices=saved;}catch{}
  const candidates=screeningCandidates(result.rows,indices);
  info={...result,rows:candidates.rows};chosen=candidates.chosen;
  excludedNotice.hidden=!candidates.excluded;
  excludedNotice.textContent=candidates.excluded+' without full-size files excluded';
  excludedNotice.title='Previews flagged “No matching full-size file” are omitted from screening and all selection operations.';

  download.hidden=!(result.saved&&result.version!==2);status(result.saved?(result.version===2?'Selection saved. Copying selected files…':'Selection saved. Download and review the copy script, then run it on the server.'):info.writable?'Ready. Select the good previews.':'This screening job is '+result.status+'.');
  if(!info.rows.length)status('No previews with matching full-size files are available. Check the suffix and extension, then start a new screening job.');
  await render();
  if(result.saved&&result.version===2)pollCopy();
 }catch(e){status(e.message);}
}
$('#prev').disabled=true;$('#next').disabled=true;
await load();
