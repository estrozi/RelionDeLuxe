import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionNavigation} from '../public/workspace-feed.js';
test('connector reveals once per click, preserving subsequent user tab changes',()=>{
 const consume=connectionNavigation(),edge={source:'A',target:'B',navigationId:1};
 assert.equal(consume(edge,'unrelated'),false);
 assert.equal(consume(edge,'B'),true);
 for(let i=0;i<5;i++)assert.equal(consume({...edge},'B'),false);
 assert.equal(consume({...edge,navigationId:2},'B'),true);
 assert.equal(consume(null,'B'),false);
});
test('each workspace consumes navigation independently and ignores passive highlights',()=>{
 const a=connectionNavigation(),b=connectionNavigation();
 assert.equal(a({source:'A',target:'B'},'A'),false);
 const edge={source:'A',target:'B',navigationId:1};
 assert.equal(a(edge,'A'),true);assert.equal(b(edge,'B'),true);
 assert.equal(a(edge,'A'),false);assert.equal(b(edge,'B'),false);
});
