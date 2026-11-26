import {unusedPickingInputs} from '../public/auto-picking-controls.js';
// Detect repairable combinations before invoking RELION's command builder.
// Return a proposal only; applying it always requires a new user-approved request.
export function configurationFix(layout,schema,values){
 const effective={...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...values};
 const unused=unusedPickingInputs(layout,effective).filter(key=>String(effective[key]||'').trim());
 if(unused.length){
  const lines=unused.map(key=>{const field=schema.options.find(f=>f.key===key),tab=Object.entries(layout.tabs||{}).find(([,keys])=>keys.includes(key))?.[0];return (field?.label||key)+(tab?' ('+tab+' tab)':'')+' '+effective[key];});
  return {configurationWarning:true,title:'Unused Auto-picking inputs',message:'The selected Auto-picking mode does not use these file inputs:\n\n'+lines.join('\n')+'\n\nClear these unused fields before continuing to avoid misleading pipeline dependencies?',changes:Object.fromEntries(unused.map(key=>[key,''])),actionLabel:'Clear unused inputs and continue'};
 }
 if(layout.name!=='Motion correction'||effective.do_own_motioncor!=='No')return null;
 const changes={},problems=[];
 if(effective.do_float16==='Yes'){changes.do_float16='No';problems.push('MotionCor2 cannot write float16 files. Set “Write output in float16?” to No.');}
 if(effective.do_save_ps==='Yes'){changes.do_save_ps='No';problems.push('MotionCor2 cannot save summed power spectra. Set “Save sum of power spectra?” to No.');}
 if(!problems.length)return null;
 return {configurationWarning:true,message:problems.join('\n\n')+'\n\nWould you like RelionDeLuxe to apply '+(problems.length===1?'this correction':'these corrections')+' and continue?',changes,
 actionLabel:problems.length===1&&changes.do_float16?'Set float16 to No and continue':'Apply fixes and continue'};
}
