export function selectRows(previous,anchor,name,order,{ctrlKey=false,metaKey=false,shiftKey=false}={}){
 const additive=ctrlKey||metaKey;let selected=new Set(previous);
 if(shiftKey&&order.includes(anchor)){
  if(!additive)selected.clear();
  const a=order.indexOf(anchor),b=order.indexOf(name);
  for(const item of order.slice(Math.min(a,b),Math.max(a,b)+1))selected.add(item);
 }else if(additive){selected.has(name)?selected.delete(name):selected.add(name);anchor=name;}
 else{selected=new Set([name]);anchor=name;}
 return {selected,anchor};
}

// Trash acts on the highlighted rows, or the inspected job when none are marked.
export function trashTargets(marked,inspected){return marked.size?[...marked]:inspected?[inspected]:[];}

// Cursor and range anchor are separate so reversing Shift+Arrow shrinks a range.
export function navigateRows(previous,anchor,cursor,order,event){
 const {key,shiftKey=false,ctrlKey=false,metaKey=false}=event;
 if(!order.length||!['ArrowUp','ArrowDown','Home','End'].includes(key))return null;
 let index=order.indexOf(cursor);
 if(index<0)index=order.findIndex(name=>previous.has(name));
 if(index<0)index=0;
 const start=order[index];
 index=key==='Home'?0:key==='End'?order.length-1:Math.max(0,Math.min(order.length-1,index+(key==='ArrowDown'?1:-1)));
 cursor=order[index];
 if((ctrlKey||metaKey)&&!shiftKey)return {selected:new Set(previous),anchor,cursor,inspect:false};
 const next=selectRows(previous,order.includes(anchor)?anchor:start,cursor,order,{shiftKey});
 return {...next,cursor,inspect:true};
}
