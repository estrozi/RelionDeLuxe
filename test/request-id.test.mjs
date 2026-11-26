import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {requestId} from '../public/request-id.js';
test('request IDs work without randomUUID on LAN HTTP and remain UUID v4',()=>{
 const insecure={getRandomValues:values=>webcrypto.getRandomValues(values)};
 const ids=Array.from({length:100},()=>requestId(insecure));
 for(const id of ids)assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
 assert.equal(new Set(ids).size,ids.length);
});
test('secure contexts use native randomUUID',()=>assert.equal(requestId({randomUUID:()=> 'native-id'}),'native-id'));
