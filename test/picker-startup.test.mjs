import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
test('Picker initializes browser history and reaches the API without lexical collisions',async()=>{
 const source=(await fs.readFile(new URL('../public/picker.js',import.meta.url),'utf8')).replace(/^import .*;\n/,'');
 const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{getContext:()=>({})});return elements.get(id);};
 let replaced=false,requested=false;
 const browserHistory={replaceState(){replaced=true;}};
 const context=vm.createContext({URLSearchParams,location:{hash:'#job=ManualPick/job001/&token=test',pathname:'/picker.html'},sessionStorage:{setItem(){},getItem(){return null;}},history:browserHistory,window:{history:browserHistory,addEventListener(){}},document:{querySelector:element,documentElement:{dataset:{}},querySelectorAll:()=>[]},fetch:async()=>{requested=true;return {ok:false,json:async()=>({error:'Test response'})};}});
 await vm.runInContext('(async()=>{'+source+'\n})()',context);
 assert(replaced);assert(requested);assert.equal(element('#status').textContent,'Test response');
});
