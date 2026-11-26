import {requestId} from './request-id.js';
export function mountParticleQuality({job,token,getState,saveCurrent,reloadCurrent,redraw,setBusy}){
 const button=document.createElement('button');button.type='button';button.textContent='Delete all reds';button.title='All micrographs: remove particles whose power is not greater than their micrograph mean power minus 2 standard deviations of particle power.';
 const controls=document.createElement('div');controls.className='quality-actions';
 const label=document.createElement('label');label.textContent='Power cutoff: AVGP − ';
 const multiplier=document.createElement('input');multiplier.type='number';multiplier.min='0';multiplier.step='0.1';multiplier.value='2';multiplier.style.width='5em';multiplier.setAttribute('aria-label','Power standard deviation multiplier');
 label.append(multiplier,document.createTextNode(' × STDP'));controls.append(label,button);document.querySelector('.ctf-panel').after(controls);
 const upper=document.createElement('input');upper.type='number';upper.min='0';upper.step='0.1';upper.value='3';upper.style.width='5em';upper.setAttribute('aria-label','Upper power standard deviation multiplier');
 const upperLabel=document.createElement('label');upperLabel.textContent='Magenta: AVGP + ';upperLabel.append(upper,document.createTextNode(' × STDP'));controls.insertBefore(upperLabel,button);
 label.firstChild.textContent='Red: AVGP − ';button.textContent='Delete all reds';
 const highButton=document.createElement('button');highButton.type='button';highButton.textContent='Delete all magentas';controls.append(highButton);
 const bothButton=document.createElement('button');bothButton.type='button';bothButton.textContent='Delete reds and magentas';bothButton.title='Delete both groups using the same per-micrograph statistics, before recalculating thresholds.';controls.append(bothButton);
 const upperFactor=()=>{const n=Number(upper.value);if(upper.value===''||!Number.isFinite(n)||n<0)throw Error('Enter a non-negative upper power multiplier.');return n;};
 const excessive=(r,p)=>p.valid&&p.power>r.powerSummary.average+upperFactor()*r.powerSummary.stddev;
 const reject=(r,p)=>!p.valid||!(p.power>cutoff(r))||excessive(r,p);
 upper.oninput=()=>{update();redraw();};
 const factor=()=>{const n=Number(multiplier.value);if(multiplier.value===''||!Number.isFinite(n)||n<0)throw Error('Enter a non-negative power multiplier.');return n;};
 const cutoff=r=>r.powerSummary.average-factor()*r.powerSummary.stddev;
 multiplier.oninput=()=>{update();redraw();};
 button.title='Check all micrographs; delete red low-power and magenta high-power particles using their per-micrograph thresholds.';

 const results=new Map();let active=false,pending='',timer,lastError='';
 const status=m=>{document.querySelector('#status').textContent=m;};
 async function api(route,body,query={}){
  const r=await fetch('/api/'+route+(body?'':'?'+new URLSearchParams({job,...query})),{method:body?'POST':'GET',headers:{'X-Relion-Token':token,...(body?{'Content-Type':'application/json','X-Request-ID':requestId()}:{})},body:body?JSON.stringify({job,...body}):undefined});
  if(!r.ok)throw Error((await r.json()).error||'Request failed');return r.json();
 }
 const signature=s=>[s.index,s.revision,s.diameter,s.dirty].join('|');
 function current(s){const r=results.get(s.index);return r&&!s.dirty&&r.revision===s.revision&&r.diameter===s.diameter?r:null;}
 async function measure(){
  const s=getState();if(active||s.busy||s.index<0||s.context?.values.do_startend==='Yes'||current(s))return;
  const key=signature(s);if(pending||lastError===key)return;pending=key;setBusy(true);
  try{await saveCurrent();const now=getState();const r=await api('picking-statistics',null,{index:now.index,diameter:now.diameter});
   if(signature(getState())===signature(now))results.set(now.index,r);
  }catch(e){lastError=signature(getState());status('Power screening unavailable: '+e.message);}
  finally{pending='';setBusy(false);redraw();}
 }
 function update(){const s=getState();controls.hidden=s.context?.values.do_startend==='Yes';multiplier.disabled=active;upper.disabled=active;let invalid=false;try{factor();upperFactor();}catch{invalid=true;}button.disabled=invalid||active||s.busy||!s.context?.writable||!!pending;highButton.disabled=button.disabled;bothButton.disabled=button.disabled;document.querySelector('#diameter').disabled=active;clearTimeout(timer);if(!current(s)&&!active&&!s.busy)timer=setTimeout(measure,350);}
 const remove=async mode=>{
 const color=mode==='both'?'red and magenta':mode==='high'?'magenta':'red';
 const selected=(r,p)=>mode==='both'?reject(r,p):mode==='high'?excessive(r,p):(!p.valid||!(p.power>cutoff(r)));
  if(active||getState().busy||pending)return;active=true;setBusy(true);update();let removed=0;
  try{await saveCurrent();const s=getState(),targets=[];
   factor();upperFactor();let next=0,done=0,failure;
   await Promise.all(Array.from({length:Math.min(s.context.powerWorkers||1,s.context.mics.length)},async()=>{
    while(next<s.context.mics.length&&!failure){const i=next++;
     try{const r=await api('picking-statistics',null,{index:i,diameter:s.diameter});results.set(i,r);done++;
      status('Checking particle powers: '+done+' / '+s.context.mics.length+' micrographs (parallel workers)…');
      if(r.rows.some(p=>selected(r,p)))targets.push(r);
     }catch(e){failure=e;}
    }
   }));if(failure)throw failure;
   const count=targets.reduce((n,r)=>n+r.rows.filter(p=>selected(r,p)).length,0);
   if(!count){status('No '+color+' particles to delete.');return;}
   if(!confirm('Delete '+count+' '+color+' particles across '+targets.length+' micrographs? Coordinate backups will be retained in the job folder.'))return;
   const batch=requestId();
   for(let i=0;i<targets.length;i++){const r=targets[i];status('Deleting '+color+' particles: '+(i+1)+' / '+targets.length+' micrographs…');const answer=await api('picking-filter',{index:r.index,diameter:r.diameter,key:r.key,automaticPower:true,powerMultiplier:factor(),upperPowerMultiplier:upperFactor(),powerMode:mode,batch});removed+=answer.removed;}
   results.clear();await reloadCurrent();status('Deleted '+removed+' '+color+' particles. Coordinate backups are in '+job+'particle-backups/.');
  }catch(e){results.clear();await reloadCurrent().catch(()=>{});status('Deletion stopped: '+e.message+' · '+removed+' particles deleted; backups retained.');}
  finally{active=false;setBusy(false);redraw();}
 };
 button.onclick=()=>remove('low');highButton.onclick=()=>remove('high');bothButton.onclick=()=>remove('both');
 highButton.title='Delete only particles above the magenta upper-power cutoff.';button.title='Delete only particles at or below the red lower-power cutoff.';
 return {update,invalidate(reason){lastError='';if(reason==='diameter')results.clear();else results.delete(getState().index);update();},isRejected(i,p){const r=current(getState());if(!r||i!==getState().index)return null;const row=r.rows[p];try{return row?(excessive(r,row)?'high':(!row.valid||!(row.power>cutoff(r)))):null;}catch{return null;}}};
}
