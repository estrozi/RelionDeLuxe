import test from 'node:test';import assert from 'node:assert/strict';
import {localDesktop,openLocalBrowser} from '../lib/open-browser.mjs';
test('local desktops only; SSH and headless sessions do not open browsers',async()=>{
 assert.equal(localDesktop({DISPLAY:':0'},'linux'),true);
 assert.equal(localDesktop({WAYLAND_DISPLAY:'wayland-0'},'linux'),true);
 assert.equal(localDesktop({},'linux'),false);
 for(const key of ['SSH_CONNECTION','SSH_CLIENT','SSH_TTY','CI'])assert.equal(localDesktop({DISPLAY:':0',[key]:'yes'},'linux'),false);
 assert.equal(await openLocalBrowser('http://localhost/',{disabled:true}),false);
 assert.equal(await openLocalBrowser('http://localhost/',{env:{},platform:'linux'}),false);
});
