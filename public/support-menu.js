export const supportColor=id=>'hsl('+((Number(id)*137.508)%360)+' 90% 60%)';
export function supportMenu(button,onSelect){
 const menu=document.createElement('div');menu.className='support-menu';menu.id=button.id+'-options';menu.role='listbox';menu.setAttribute('aria-label','Support element');menu.hidden=true;document.body.append(menu);
 button.type='button';button.classList.add('support-menu-trigger');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-expanded','false');
 let entries=[],selected='',focus=0;
 const paint=(node,entry)=>{
  node.replaceChildren();const swatch=document.createElement('span');swatch.className='support-swatch';swatch.setAttribute('aria-hidden','true');if(entry.id)swatch.style.backgroundColor=supportColor(entry.id);else swatch.classList.add('empty');
  const label=document.createElement('span');label.textContent=entry.label;node.append(swatch,label);
 };
 function close(restore=false){menu.hidden=true;button.setAttribute('aria-expanded','false');if(restore)button.focus();}
 function position(){
  const r=button.getBoundingClientRect(),width=Math.min(Math.max(r.width,190),innerWidth-16);menu.style.width=width+'px';menu.style.left=Math.max(8,Math.min(r.left,innerWidth-width-8))+'px';
  const below=innerHeight-r.bottom-8,above=r.top-8;
  menu.style.maxHeight=Math.min(300,Math.max(60,below>=100?below:above))+'px';
  menu.style.top=below>=100?r.bottom+4+'px':Math.max(8,r.top-menu.offsetHeight-4)+'px';
 }
 function focusOption(i){focus=Math.max(0,Math.min(entries.length-1,i));const option=menu.children[focus];option?.focus();option?.scrollIntoView({block:'nearest'});}
 function open(){if(button.disabled)return;menu.hidden=false;button.setAttribute('aria-expanded','true');position();focusOption(Math.max(0,entries.findIndex(e=>e.id===selected)));}
 function pick(i){const entry=entries[i];if(!entry)return;selected=entry.id;button.value=entry.id;close(true);onSelect(entry.id);}
 button.onclick=()=>menu.hidden?open():close();
 button.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open();if(e.key==='Home')focusOption(0);if(e.key==='End')focusOption(entries.length-1);}};
 menu.onkeydown=e=>{
  if(e.key==='Escape'){e.preventDefault();close(true);}
  else if(e.key==='Tab'){close();button.focus();}
  else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();focusOption(e.key==='Home'?0:e.key==='End'?entries.length-1:focus+(e.key==='ArrowDown'?1:-1));}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(focus);}
 };
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target)&&!button.contains(e.target))close();});
 window.addEventListener('resize',()=>{if(!menu.hidden)position();});
 document.addEventListener('scroll',e=>{if(!menu.hidden&&!menu.contains(e.target))close();},true);
 return {update(options,value){
  const next=JSON.stringify([options,value]);if(next===button.dataset.menuState)return;button.dataset.menuState=next;
  close();entries=options;selected=String(value||'');button.value=selected;
  paint(button,entries.find(e=>e.id===selected)||entries[0]);
  menu.replaceChildren();entries.forEach((entry,i)=>{const option=document.createElement('div');option.role='option';option.tabIndex=-1;option.setAttribute('aria-selected',String(entry.id===selected));paint(option,entry);option.onclick=()=>pick(i);option.onfocus=()=>focus=i;menu.append(option);});
 },close};
}
