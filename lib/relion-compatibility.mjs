import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolveExecutable} from './executables.mjs';
export function versionFamily(text){return String(text||'').match(/\b(5\.[01])(?:\.\d+)?\b/)?.[1]||null;}
// Capability checks, rather than guessed executable versions, select the editor.
export function adaptRelionLayouts(layout,catalog,placements){
 for(const l of layout){
  const schema=catalog.find(s=>s.id===l.id);if(!schema)continue;
  const keys=new Set(schema.options.map(f=>f.key));
  for(const rule of Object.values(l.fields||{}))rule.when=(rule.when||[]).filter(c=>keys.has(c.key));
  l.overrides=Object.fromEntries(Object.entries(l.overrides||{}).filter(([k])=>keys.has(k)));
  for(const tab of Object.keys(l.tabs))l.tabs[tab]=l.tabs[tab].filter(k=>keys.has(k));
  if(l.name==='Extract subtomos'&&keys.has('subtomo_format')){
   delete l.tabs.Reconstruct;
   l.tabs.Extract=['box_size_angst','precrop_size_angst','binned_size_pix','max_dose','min_frames','subtomo_format','do_float16'].filter(k=>keys.has(k));
  }
  if(l.name==='Auto-picking'&&keys.has('do_amyloid_fom')&&placements?.[l.id]?.Amyloid){
   const nativeTabs={};
   for(const [tab,fields] of Object.entries(placements[l.id])){
    nativeTabs[tab]=fields.map(f=>f.key).filter(key=>keys.has(key));
    for(const f of fields)if(keys.has(f.key))(l.fields??={})[f.key]={toggle:f.toggle,when:(f.when||[]).filter(c=>keys.has(c.key))};
   }
   l.tabs=nativeTabs;
   const log=schema.options.find(f=>f.key==='do_log');
   if(log?.help)log.help=log.help.replace(/autopick tab/g,'Refs 2 tab');
   continue;
  }
  const used=new Set(Object.values(l.tabs).flat());
  for(const [tab,fields] of Object.entries(placements?.[l.id]||{})){
   // Keep existing RelionDeLuxe merged tabs and custom field ordering.
   const target=Object.entries(l.tabs).find(([,list])=>fields.some(f=>list.includes(f.key)))?.[0]||tab;
   for(const f of fields){if(!keys.has(f.key))continue;
    if(!l.fields?.[f.key])(l.fields??={})[f.key]={toggle:f.toggle,when:(f.when||[]).filter(c=>keys.has(c.key))};
    if(used.has(f.key))continue;
    (l.tabs[target]??=[]).push(f.key);used.add(f.key);
    (l.fields??={})[f.key]={toggle:f.toggle,when:(f.when||[]).filter(c=>keys.has(c.key))};
   }
  }
 }
}
export async function relionCompatibility(native,{cwd,env,catalog}={}){
 let capabilities={};try{capabilities=await native.call(['capabilities']);}catch{}
 const inferred=catalog?.find(s=>s.id===51||s.id===9);
 const bridge=capabilities.relionVersion||(inferred?((inferred.options.some(f=>['subtomo_format','blush_version'].includes(f.key))?'5.1':'5.0')+' (schema inferred)'):null);
 const executable=await resolveExecutable('relion_refine',{cwd,env});let runtime=null;
 if(executable)try{
  const result=await promisify(execFile)(executable,['--version'],{cwd,env,timeout:5000,maxBuffer:65536});
  runtime=(result.stdout+'\n'+result.stderr).match(/(?:RELION\s+version\s*:?\s*|^\s*)(5\.[01](?:\.\d+)?[^\s]*)/im)?.[1]||null;
 }catch{}
 const mismatch=versionFamily(bridge)&&versionFamily(runtime)&&versionFamily(bridge)!==versionFamily(runtime);
 return {bridge,runtime,executable,mismatch:!!mismatch,message:mismatch?`RELION version mismatch: bridge ${bridge}, executable ${runtime}. Rebuild scripts/build_bridge.py against the source for your installed RELION version before submitting jobs.`:!bridge?'Bridge source version is unknown. Rebuild the bridge from this release using the source matching your RELION installation.':!runtime?'Could not detect the runtime RELION version; the editor follows the compiled bridge. Verify that its source matches your installed executables.':''};
}
