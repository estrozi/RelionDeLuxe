import test from 'node:test';
import assert from 'node:assert/strict';
import {selectRows} from '../public/job-selection.js';
test('Job row selection supports replacement, Ctrl/Cmd toggles and visible-order Shift ranges',()=>{
 const order=['running','finished1','finished2','scheduled'];
 let s=selectRows(new Set(),null,'finished1',order);assert.deepEqual([...s.selected],['finished1']);
 s=selectRows(s.selected,s.anchor,'scheduled',order,{ctrlKey:true});assert.deepEqual([...s.selected],['finished1','scheduled']);
 s=selectRows(s.selected,s.anchor,'finished1',order,{metaKey:true});assert.deepEqual([...s.selected],['scheduled']);
 s=selectRows(s.selected,s.anchor,'scheduled',order,{shiftKey:true});assert.deepEqual([...s.selected],['finished1','finished2','scheduled']);
 s=selectRows(s.selected,s.anchor,'running',order,{ctrlKey:true});
 s=selectRows(s.selected,s.anchor,'finished1',order,{ctrlKey:true,shiftKey:true});assert.equal(s.selected.size,4);
 s=selectRows(s.selected,'deleted','finished2',order,{shiftKey:true});assert.deepEqual([...s.selected],['finished2']);
});
test('Move to Trash targets the selection, falling back only when no rows are marked',async()=>{
 const {trashTargets}=await import('../public/job-selection.js');
 assert.deepEqual(trashTargets(new Set(['a','b']),'c'),['a','b']);
 assert.deepEqual(trashTargets(new Set(),'c'),['c']);
 assert.deepEqual(trashTargets(new Set(),null),[]);
});

test('Keyboard arrows move selection; Shift grows, shrinks and crosses the anchor',async()=>{
 const {navigateRows}=await import('../public/job-selection.js');
 const order=['a','b','c','d'];
 let s={selected:new Set(['b']),anchor:'b',cursor:'b'};
 const key=(key,extra={})=>s=navigateRows(s.selected,s.anchor,s.cursor,order,{key,...extra});
 key('ArrowDown',{shiftKey:true});assert.deepEqual([...s.selected],['b','c']);
 key('ArrowDown',{shiftKey:true});assert.deepEqual([...s.selected],['b','c','d']);
 key('ArrowUp',{shiftKey:true});assert.deepEqual([...s.selected],['b','c']);
 key('ArrowUp',{shiftKey:true});assert.deepEqual([...s.selected],['b']);
 key('ArrowUp',{shiftKey:true});assert.deepEqual([...s.selected],['a','b']);
 key('ArrowDown');assert.deepEqual([...s.selected],['b']);assert.equal(s.anchor,'b');
 key('End',{shiftKey:true});assert.deepEqual([...s.selected],['b','c','d']);
 key('Home');assert.deepEqual([...s.selected],['a']);
 key('ArrowUp');assert.equal(s.cursor,'a');
 key('ArrowDown',{ctrlKey:true});assert.equal(s.cursor,'b');assert.deepEqual([...s.selected],['a']);assert.equal(s.inspect,false);
 key('End',{metaKey:true});assert.equal(s.cursor,'d');assert.deepEqual([...s.selected],['a']);
 assert.equal(navigateRows(s.selected,s.anchor,s.cursor,[],{key:'ArrowDown'}),null);
 assert.equal(navigateRows(s.selected,s.anchor,s.cursor,order,{key:'Tab'}),null);
 const stale=navigateRows(new Set(['b']),'deleted','b',order,{key:'ArrowDown',shiftKey:true});assert.deepEqual([...stale.selected],['b','c']);
});
