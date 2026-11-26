import test from 'node:test';
import assert from 'node:assert/strict';
import {ctfPreviewSession,mountCtfPreview} from '../public/ctf-preview.js';
test('Update preview refreshes the sample, shares its row with status and preserves scroll',async t=>{
 const oldFetch=globalThis.fetch,oldDocument=globalThis.document;t.after(()=>{globalThis.fetch=oldFetch;globalThis.document=oldDocument;});
 const scroll={scrollTop:123};globalThis.document={querySelector:()=>scroll};
 const requests=[],image=Buffer.alloc(12);image.writeUInt32LE(1,0);image.writeUInt32LE(1,4);
 globalThis.fetch=async(_url,options)=>{requests.push(JSON.parse(options.body));scroll.scrollTop=0;return {ok:true,json:async()=>({image:image.toString('base64'),micrograph:requests.length===1?'a.mrc':'b.mrc',angpix:1.5,resmin:30,resmax:5,actualResmax:5})};};
 const el=(tag,text='',className='')=>({tag,textContent:text,className,children:[],style:{},append(...children){this.children.push(...children);},setAttribute(k,v){this[k]=v;},addEventListener(){},removeEventListener(){},querySelector(){return null;},getContext(){return {createImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){},save(){},restore(){},beginPath(){},arc(){},stroke(){}};}});
 const container=el('div'),session=ctfPreviewSession(),getValues=()=>({input_star_mics:'input.star',resmin:'30',resmax:'5'});
 const dispose=mountCtfPreview({container,session,getValues,token:'test',el});await session.promise;await new Promise(resolve=>setImmediate(resolve));
 const actions=container.children[0],button=actions.children.find(e=>e.tag==='button');
 assert.equal(actions.children.find(e=>e.tag==='p').role,'status');assert.equal(actions.children.length,2);assert.equal(scroll.scrollTop,123);
 const oldSeed=requests[0].seed;await button.onclick();assert.equal(requests.length,2);assert.notEqual(requests[1].seed,oldSeed);assert.equal(requests[1].excludeMicrograph,'a.mrc');assert.equal(session.micrograph,'b.mrc');assert.equal(scroll.scrollTop,123);
 dispose();const disposeAgain=mountCtfPreview({container:el('div'),session,getValues,token:'test',el});await session.promise;await new Promise(resolve=>setImmediate(resolve));assert.equal(requests.length,2,'tab switching retains the completed preview');disposeAgain();
});
