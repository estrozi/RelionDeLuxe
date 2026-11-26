import fs from 'node:fs/promises';
import path from 'node:path';
const absent=e=>['ENOENT','ENOTDIR','ELOOP'].includes(e.code);
const escape=c=>c.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
function alternatives(pattern){
 const match=pattern.match(/\{([^{}]*,[^{}]*)\}/);if(!match)return [pattern];
 const result=match[1].split(',').flatMap(part=>alternatives(pattern.slice(0,match.index)+part+pattern.slice(match.index+match[0].length)));
 if(result.length>256)throw Error('Too many file-pattern alternatives.');return result;
}
function segment(pattern){
 let source='';
 for(let i=0;i<pattern.length;i++){
  const c=pattern[i];
  if(c==='*')source+='.*';else if(c==='?')source+='.';
  else if(c==='\\'&&i+1<pattern.length)source+=escape(pattern[++i]);
  else if(c==='['){const end=pattern.indexOf(']',i+1);if(end>i+1){let body=pattern.slice(i+1,end);if(body[0]==='!')body='^'+body.slice(1);try{new RegExp('['+body+']');source+='['+body+']';i=end;continue;}catch{}}source+='\\[';}
  else source+=escape(c);
 }
 return new RegExp('^'+source+'$');
}
// Existence-only globbing using long-established fs APIs. No shell, external
// dependency, or fs.promises.glob requirement. Follow movie-directory symlinks
// while bounding recursive ** walks by real-directory/index pairs.
export async function hasMatchingFile(pattern){
 for(const expanded of alternatives(path.resolve(pattern))){
  const root=path.parse(expanded).root,parts=expanded.slice(root.length).split(path.sep).filter(Boolean),seen=new Set();
  async function visit(current,index){
   if(index===parts.length){try{return (await fs.stat(current)).isFile();}catch(e){if(absent(e))return false;throw e;}}
   let real;try{real=await fs.realpath(current);if(!(await fs.stat(real)).isDirectory())return false;}catch(e){if(absent(e))return false;throw e;}
   const state=real+'\0'+index;if(seen.has(state))return false;seen.add(state);
   const part=parts[index];
   if(part==='**'&&await visit(current,index+1))return true;
   if(!/[?*\[\\]/.test(part))return visit(path.join(current,part),index+1);
   let names;try{names=await fs.readdir(current);}catch(e){if(absent(e))return false;throw e;}
   const matches=part==='**'?null:segment(part);
   for(const name of names){if(name.startsWith('.')&&!part.startsWith('.'))continue;if(matches&&!matches.test(name))continue;if(part==='**'&&index===parts.length-1&&await visit(path.join(current,name),index+1))return true;if(await visit(path.join(current,name),part==='**'?index:index+1))return true;}
   return false;
  }
  if(await visit(root,0))return true;
 }
 return false;
}

export async function matchingFiles(project,readRoots,pattern,firstOnly=false){
 const {readablePath}=await import('./paths.mjs');
 const files=new Set();let visited=0;
 for(const expanded of alternatives(path.resolve(project,pattern))){
  const root=path.parse(expanded).root,parts=expanded.slice(root.length).split(path.sep).filter(Boolean);
  let start=parts.findIndex(p=>/[?*\[\\]/.test(p));if(start<0)start=parts.length-1;
  const base=path.join(root,...parts.slice(0,start));
  try{await readablePath(project,readRoots,base);}catch(e){if(absent(e))continue;throw e;}
  const seen=new Set();
  async function walk(current,index){
   if(firstOnly&&files.size)return;
   if(++visited>100000)throw Error('Pattern is too broad to count; choose a narrower folder.');
   let real,st;try{real=await readablePath(project,readRoots,current);st=await fs.stat(real);}catch(e){if(absent(e))return;throw e;}
   if(index===parts.length){if(st.isFile())files.add(current);return;}
   if(!st.isDirectory())return;
   const key=real+'\0'+index;if(seen.has(key))return;seen.add(key);
   const part=parts[index];if(part==='**')await walk(current,index+1);
   if(!/[?*\[\\]/.test(part)){await walk(path.join(current,part),index+1);return;}
   const re=part==='**'?null:segment(part);
   for(const name of await fs.readdir(current)){if(name.startsWith('.')&&!part.startsWith('.'))continue;if(re&&!re.test(name))continue;await walk(path.join(current,name),part==='**'?index:index+1);if(part==='**'&&index===parts.length-1)await walk(path.join(current,name),index+1);}
  }
  await walk(base,start);if(firstOnly&&files.size)break;
 }
 return [...files];
}

export async function countMatchingFiles(project,readRoots,pattern,firstOnly=false){
 const files=await matchingFiles(project,readRoots,pattern,firstOnly);
 return firstOnly?(files[0]||null):files.length;
}
