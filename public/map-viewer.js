import {localResolutionFile,resolutionRange,sampleResolution,resolutionColor} from './local-resolution-color.js';
import {boundedVolume} from './surface-budget.js';
import {addAngularDistribution} from './bild.js';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.hash.slice(1));
const file=params.get('file')||'',token=params.get('token')||sessionStorage.getItem('relion-token')||'';
if(token)sessionStorage.setItem('relion-token',token);
params.delete('token');history.replaceState(null,'',location.pathname+'#'+params);
const themes={light:'#f6f8fa',dark:'#18232f',brazil:'#fff7c2',france:'#eef3fc'};
const theme=Object.hasOwn(themes,params.get('theme'))?params.get('theme'):'light';
document.documentElement.dataset.theme=theme;$('#theme').value=theme;
$('#filename').textContent=file;document.title=file.split('/').pop()+' · 3D viewer';
const background=themes[theme];$('#background').value=background;
let stage,surface,timer,renderSurface;const abort=new AbortController();
$('#theme').onchange=()=>{const theme=$('#theme').value;document.documentElement.dataset.theme=theme;$('#background').value=themes[theme];stage?.setParameters({backgroundColor:themes[theme]});params.set('theme',theme);history.replaceState(null,'',location.pathname+'#'+params);};
const status=text=>{$('#status').textContent=text;};
try{
 if(!globalThis.NGL)throw Error('NGL could not be loaded.');
 stage=new NGL.Stage('viewport',{backgroundColor:background,cameraType:'orthographic',clipNear:0,clipFar:100,clipMode:'scene',clipScale:'relative'});
 const resize=new ResizeObserver(()=>stage.handleResize());resize.observe($('#viewport'));
 window.addEventListener('pagehide',()=>{abort.abort();clearTimeout(timer);resize.disconnect();stage.dispose();},{once:true});
 $('#background').oninput=()=>stage.setParameters({backgroundColor:$('#background').value});
 $('#camera').onchange=()=>stage.setParameters({cameraType:$('#camera').value});
 const updateClip=changed=>{
  let near=Number($('#clip-near').value),far=Number($('#clip-far').value);
  if(near>=far){if(changed==='near')near=far-1;else far=near+1;}
  $('#clip-near').value=near;$('#clip-far').value=far;
  $('#clip-values').value=`Near ${near}% · Far ${far}%`;
  stage.setParameters({clipNear:near,clipFar:far});
 };
 $('#clip-near').oninput=()=>updateClip('near');$('#clip-far').oninput=()=>updateClip('far');
 $('#center').onclick=()=>stage.autoView();
 $('#map-visible').onchange=()=>surface?.setVisibility($('#map-visible').checked);
 $('#color').oninput=()=>surface?.setParameters({color:$('#color').value});
 $('#alpha').oninput=()=>{$('#alpha-value').value=$('#alpha').value+'%';surface?.setParameters({opacity:1-Number($('#alpha').value)/100});};
 const threshold=value=>{if(!Number.isFinite(value))return;$('#level').value=String(value);$('#level-slider').min=Math.min(Number($('#level-slider').min),value);$('#level-slider').max=Math.max(Number($('#level-slider').max),value);$('#level-slider').value=String(value);clearTimeout(timer);timer=setTimeout(()=>renderSurface?.(value),200);};
 $('#level').oninput=()=>{if($('#level').value.trim())threshold(Number($('#level').value));};
 $('#level-slider').oninput=()=>threshold(Number($('#level-slider').value));
 $('#smooth').onchange=()=>surface?.setParameters({smooth:$('#smooth').checked?10:0});
 function addStructure(component,name){
    if(!component.structure?.atomCount)throw Error('No atoms found in '+name);
    let representation=component.addRepresentation('cartoon',{colorScheme:'chainname'});
    const row=document.createElement('div');row.className='structure';
    const label=document.createElement('label'),visible=document.createElement('input');visible.type='checkbox';visible.checked=true;label.append(visible,document.createTextNode(' '+name));visible.onchange=()=>component.setVisibility(visible.checked);
    const select=document.createElement('select');select.setAttribute('aria-label','Representation for '+name);
    for(const [value,title] of [['cartoon','Cartoon'],['ribbon','Ribbon'],['licorice','Licorice'],['ball+stick','Ball and stick'],['spacefill','Space filling'],['backbone','Backbone'],['line','Lines'],['surface','Molecular surface']]){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}
    select.onchange=()=>{try{const next=component.addRepresentation(select.value,{colorScheme:'chainname'});component.removeRepresentation(representation);representation=next;}catch(e){status(e.message);}};
    const remove=document.createElement('button');remove.textContent='Remove';remove.onclick=()=>{stage.removeComponent(component);row.remove();};row.append(label,select,remove);$('#structures').append(row);status('Loaded '+name);

 }
 async function loadStructure(blob,name){
  let component;
  try{
   component=await stage.loadFile(blob,{ext:/\.(cif|mmcif)$/i.test(name)?'cif':'pdb',defaultRepresentation:false});
   addStructure(component,name);
   stage.tasks.onZeroOnce(()=>stage.autoView(0));
  }catch(e){if(component)stage.removeComponent(component);throw e;}
 }
 $('#pdb').onchange=async()=>{
  const files=[...$('#pdb').files];$('#pdb').value='';
  for(const local of files)try{await loadStructure(local,local.name);}catch(e){status('Structure unavailable: '+e.message);}
 };
 if(/\.(cif|mmcif)$/i.test(file)){
  $('#surface-controls').hidden=true;
  status('Loading atomic model…');
  const response=await fetch('/api/map-download?file='+encodeURIComponent(file),{headers:{'X-Relion-Token':token},signal:abort.signal});
  if(!response.ok)throw Error((await response.json()).error||'Structure request failed');
  await loadStructure(await response.blob(),file.split('/').pop());
 }else{
 if(!file)throw Error('No map selected. Open a map from the job node list.');
 const response=await fetch('/api/map-preview?file='+encodeURIComponent(file),{headers:{'X-Relion-Token':token},signal:abort.signal});
 if(!response.ok)throw Error((await response.json()).error||'Map request failed');
 const isMask=response.headers.get('X-Relion-Map-Kind')==='mask';
 const component=await stage.loadFile(await response.blob(),{ext:'mrc',defaultRepresentation:false});
 const data=component.volume.data;let min=Infinity,max=-Infinity,sum=0,count=0;
 for(const v of data)if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);sum+=v;count++;}
 if(!count||max<=min)throw Error('Map has no varying finite density.');
 const mean=sum/count;let variance=0;for(const v of data)if(Number.isFinite(v))variance+=(v-mean)**2;
 const sigma=Math.sqrt(variance/count),initial=isMask?0.5:mean+3*sigma;
 $('#level-slider').min=Math.min(min,initial);$('#level-slider').max=Math.max(max,initial);$('#level-slider').step=(max-min)/2000;$('#level-slider').value=initial;$('#level').value=initial;
 let previewComponent,colorScheme;
 const colorOptions=()=>colorScheme&&$('#resolution-enabled').checked?{colorScheme,colorVolume:undefined}:{colorScheme:'uniform',color:$('#color').value};
 const companion=localResolutionFile(file);
 if(companion){
  $('#resolution-controls').hidden=false;
  $('#resolution-file').textContent=companion;
  try{
   const reply=await fetch('/api/map-preview?file='+encodeURIComponent(companion),{headers:{'X-Relion-Token':token},signal:abort.signal});
   if(!reply.ok)throw Error((await reply.json()).error||'Resolution map request failed');
   const colors=await stage.loadFile(await reply.blob(),{ext:'mrc',defaultRepresentation:false});
   const [low,high]=resolutionRange(colors.volume.data);
   $('#resolution-min').value=String(low);$('#resolution-max').value=String(high);
   let limits=[low,high];
   colorScheme=NGL.ColormakerRegistry.addScheme(function(){this.positionColor=p=>resolutionColor(sampleResolution(colors.volume,p),...limits);},'Local resolution');
   window.addEventListener('pagehide',()=>NGL.ColormakerRegistry.removeScheme(colorScheme),{once:true});
   const update=()=>{
    const min=Number($('#resolution-min').value),max=Number($('#resolution-max').value);
    if(!(min>0&&max>min)){ $('#resolution-message').textContent='Enter positive limits with the blue limit smaller than the red limit.';return; }
    limits=[min,max];$('#resolution-message').textContent='Gray: no valid resolution estimate.';
    $('#resolution-legend').textContent=`${min} Å (higher resolution) → ${max} Å (lower resolution)`;
    $('#color').disabled=$('#resolution-enabled').checked;
    // A changed domain must refresh the custom scheme even if its ID is unchanged.
    if(surface){surface.setParameters({colorScheme:'uniform'});surface.setParameters(colorOptions());}
   };
   $('#resolution-enabled').disabled=false;
   $('#resolution-min').disabled=false;$('#resolution-max').disabled=false;
   $('#resolution-enabled').onchange=update;$('#resolution-min').onchange=update;$('#resolution-max').onchange=update;update();
  }catch(e){$('#resolution-enabled').checked=false;$('#resolution-message').textContent='Density shown without local-resolution coloring: '+e.message;}
 }

 renderSurface=level=>{
  const reduced=boundedVolume(component.volume,level);
  if(previewComponent)stage.removeComponent(previewComponent);
  const volume=new NGL.Volume('Map preview','',reduced.data,reduced.nx,reduced.ny,reduced.nz);
  const matrix=component.volume.matrix.clone(),elements=matrix.elements,factor=reduced.factor,offset=(factor-1)/2;
  for(let row=0;row<3;row++){elements[12+row]+=offset*(elements[row]+elements[4+row]+elements[8+row]);for(const col of [0,4,8])elements[col+row]*=factor;}
  volume.setMatrix(matrix);previewComponent=stage.addComponentFromObject(volume);
  surface=previewComponent.addRepresentation('surface',{isolevelType:'value',isolevel:level,boxSize:0,smooth:$('#smooth').checked?10:0,useWorker:true,...colorOptions(),opacity:1-Number($('#alpha').value)/100,opaqueBack:true});
  surface.setVisibility($('#map-visible').checked);
  status('Mean '+mean.toPrecision(5)+' · σ '+sigma.toPrecision(5)+' · Initial level ('+(isMask?'mask: 0.5':'mean + 3σ')+') '+initial.toPrecision(5)+' · Density range '+min.toPrecision(5)+' to '+max.toPrecision(5)+(factor>1?' · Display reduced '+factor+'× per axis to keep the surface within browser limits. Original map unchanged.':''));
 };
 renderSurface(initial);
 stage.tasks.onZeroOnce(()=>stage.autoView(0));$('#surface-controls').disabled=false;

 // Missing distributions are normal for maps from other job types.
 try{const response=await fetch('/api/map-angular-distribution?file='+encodeURIComponent(file),{headers:{'X-Relion-Token':token},signal:abort.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Distribution request failed');if(result.cylinders.length){const angular=addAngularDistribution(stage,NGL,result.cylinders);$('#angular-controls').hidden=false;$('#angular-file').textContent=result.file;$('#angular-visible').onchange=()=>angular.setVisibility($('#angular-visible').checked);stage.autoView(0);}}
 catch(e){if(!abort.signal.aborted)status('Map loaded; angular distribution unavailable: '+e.message);}

}
}catch(e){status('3D file unavailable: '+e.message);}
