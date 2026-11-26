import test from 'node:test';import assert from 'node:assert/strict';
import {SliceCache} from '../public/slice-cache.js';
const value=(slice=5)=>({data:new Float32Array(4),geometry:{dimensions:[11,11,11],axis:'Z',slice}});
const tick=()=>new Promise(r=>setImmediate(r));
test('cache reuses equivalent slice positions and bounds memory',async()=>{
 let calls=0;const cache=new SliceCache(async(f,a,p)=>{calls++;return value(Math.round(p*10));},{maxBytes:32});
 await cache.get('a','Z',.5);await cache.get('a','Z',.51);assert.equal(calls,1);
 await cache.get('a','Z',.6);await cache.get('a','Z',.7);assert.equal(cache.bytes,32);
 await cache.get('a','Z',.5);assert.equal(calls,4);
 await cache.get('b','Z',.5);await cache.get('b','X',.5);assert.equal(calls,6);
});
test('deduplicates pending reads; prioritizes foreground and cancels queued prefetch',async()=>{
 const calls=[],release=[];const cache=new SliceCache((f)=>{calls.push(f);return new Promise(r=>release.push(()=>r(value())));},{concurrency:1});
 const a=cache.get('a','Z',.5,true),duplicate=cache.get('a','Z',.5);
 assert.equal(a,duplicate);
 const b=cache.get('b','Z',.5,true),c=cache.get('c','Z',.5);
 await tick();release.shift()();await a;await tick();assert.deepEqual(calls,['a','c']);
 cache.cancelPrefetch();assert.equal(await b,null);
 release.shift()();await c;assert.equal(cache.bytes,32);
});
test('failure is retriable and expiry reloads content',async()=>{
 let calls=0;const cache=new SliceCache(async()=>{if(++calls===1)throw Error('missing');return value();},{ttl:-1});
 await assert.rejects(cache.get('a','Z',.5),/missing/);await tick();
 await cache.get('a','Z',.5);await tick();await cache.get('a','Z',.5);assert.equal(calls,3);
});
test('only one speculative read is active while foreground can use other slots',async()=>{
 const calls=[],release=[];const cache=new SliceCache(f=>{calls.push(f);return new Promise(r=>release.push(()=>r(value())));});
 const a=cache.get('a','Z',.5,true),b=cache.get('b','Z',.5,true),c=cache.get('c','Z',.5);
 await tick();assert.deepEqual(calls,['a','c']);cache.cancelPrefetch();assert.equal(await b,null);
 release.forEach(r=>r());await Promise.all([a,c]);
});

test('obsolete queued foreground requests are discarded without extra I/O',async()=>{
 let release,calls=0;const cache=new SliceCache(()=>{calls++;return new Promise(r=>release=()=>r(value()));},{concurrency:1});
 const first=cache.get('first','Z',.5),old=cache.get('old','Z',.5);
 await tick();cache.cancelQueued();assert.equal(await old,null);release();await first;await tick();assert.equal(calls,1);
});
