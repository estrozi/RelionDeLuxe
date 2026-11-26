export function attachCliCompletion(input,load){
 let data=null,pending=null,selected=0,items=[],menu;
 const token=()=>{const end=input.selectionStart??input.value.length,start=input.value.slice(0,end).search(/(?:^|\s)--[\w-]*$/);if(start<0)return null;const left=input.value.slice(0,end),m=left.match(/--[\w-]*$/);return m?{start:end-m[0].length,end,prefix:m[0]}:null;};
 const close=()=>{menu?.remove();menu=null;input.setAttribute('aria-expanded','false');};
 input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
 function choose(i){const t=token();if(!t||!items[i])return;input.setRangeText(items[i].option+' ',t.start,t.end,'end');close();input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}
 function paint(message){
  close();if(!input.isConnected||document.activeElement!==input)return;
  menu=document.createElement('div');menu.className='cli-completions';menu.setAttribute('role','listbox');document.body.append(menu);
  if(menu.showPopover){menu.setAttribute('popover','manual');menu.showPopover();}
  const r=input.getBoundingClientRect();menu.style.cssText='position:fixed;left:'+Math.max(4,r.left)+'px;top:'+Math.max(4,Math.min(r.bottom+3,innerHeight-240))+'px;width:'+Math.min(Math.max(r.width,320),innerWidth-16)+'px';
  input.setAttribute('aria-expanded','true');
  if(message){menu.textContent=message;return;}
  items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.textContent=item.option;b.title=item.description;b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===selected));b.onmousedown=e=>e.preventDefault();b.onclick=()=>choose(i);menu.append(b);});
 }
 async function update(){
  const t=token();if(!t||input.disabled){close();return;}
  if(!data){paint('Loading executable options…');try{data=await(pending??=load());}catch(e){data={options:[],message:e.message};}if(!input.isConnected||document.activeElement!==input||!token()){close();return;}}
  items=data.options.filter(x=>x.option.startsWith(token().prefix));selected=0;paint(items.length?null:data.message||'No matching CLI options.');
 }
 input.addEventListener('input',update);input.addEventListener('click',update);
 input.addEventListener('keydown',e=>{if(!menu)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}else if(['ArrowDown','ArrowUp'].includes(e.key)&&items.length){e.preventDefault();selected=(selected+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;paint();menu.children[selected]?.scrollIntoView({block:'nearest'});}else if(e.key==='Enter'&&items.length){e.preventDefault();choose(selected);}});
 input.addEventListener('blur',close);
 const observer=new MutationObserver(()=>{if(!input.isConnected){close();observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});
}
