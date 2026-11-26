// Per-tab bounded preview cache; foreground requests always precede speculative reads.
export class SliceCache{
 constructor(load,{maxBytes=64*1024*1024,ttl=60000,concurrency=4}={}){
  Object.assign(this,{load,maxBytes,ttl,concurrency});this.entries=new Map();this.pending=new Map();this.geometry=new Map();this.queue=[];this.bytes=0;this.active=0;this.background=0;
 }
 key(file,axis,fraction){
  const g=this.geometry.get(JSON.stringify([file,axis]));
  return JSON.stringify([file,axis,g&&Date.now()-g.time<this.ttl?Math.round(fraction*(g.count-1)):fraction]);
 }
 get(file,axis,fraction,prefetch=false){
  const key=this.key(file,axis,fraction),hit=this.entries.get(key);
  if(hit&&Date.now()-hit.time<this.ttl){this.entries.delete(key);this.entries.set(key,hit);return Promise.resolve(hit.value);}
  if(hit){this.entries.delete(key);this.bytes-=hit.size;}
  const existing=this.pending.get(key);
  if(existing){if(!prefetch)existing.prefetch=false;this.pump();return existing.promise;}
  let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  const task={key,file,axis,fraction,prefetch,promise,resolve,reject};this.pending.set(key,task);this.queue.push(task);this.pump();return promise;
 }
 cancelQueued(){
  for(const t of this.queue){this.pending.delete(t.key);t.resolve(null);}this.queue=[];
 }
 cancelPrefetch(){
  this.queue=this.queue.filter(t=>{if(!t.prefetch)return true;this.pending.delete(t.key);t.resolve(null);return false;});
 }
 pump(){
  while(this.active<this.concurrency){
   let i=this.queue.findIndex(t=>!t.prefetch);
   if(i<0){if(this.background>=1)return;i=this.queue.findIndex(t=>t.prefetch);}
   if(i<0)return;
   const t=this.queue.splice(i,1)[0],background=t.prefetch;this.active++;if(background)this.background++;
   Promise.resolve().then(()=>this.load(t.file,t.axis,t.fraction)).then(value=>{
    const g=value.geometry;
    if(t.axis&&g){this.geometry.set(JSON.stringify([t.file,t.axis]),{count:g.dimensions[{X:0,Y:1,Z:2}[t.axis]],time:Date.now()});if(this.geometry.size>256)this.geometry.delete(this.geometry.keys().next().value);}
    const key=this.key(t.file,t.axis,t.fraction),size=value.data.byteLength;
    if(size<=this.maxBytes){
     const old=this.entries.get(key);if(old)this.bytes-=old.size;this.entries.delete(key);
     this.entries.set(key,{value,size,time:Date.now()});this.bytes+=size;
     while(this.bytes>this.maxBytes){const first=this.entries.keys().next().value;this.bytes-=this.entries.get(first).size;this.entries.delete(first);}
    }
    t.resolve(value);
   },t.reject).finally(()=>{this.pending.delete(t.key);this.active--;if(background)this.background--;this.pump();});
  }
 }
}
