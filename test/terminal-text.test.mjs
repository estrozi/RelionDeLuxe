import test from 'node:test';
import assert from 'node:assert/strict';
import {terminalText} from '../public/terminal-text.js';
test('RELION-style progress updates replace a line and preserve completed output',()=>{
 const progress=n=>'\r   1/  10 sec '+'.'.repeat(n)+'~~(,_,\">'+' '.repeat(57-n)+'[oo]';
 const log='Starting\n'+progress(1)+progress(20)+progress(40);
 assert.equal(terminalText(log),'Starting\n'+progress(40).slice(1));
 assert.equal(terminalText(log+'\r   5/   5 sec '+'.'.repeat(60)+'~~(,_,\"> yum!\nDone\n'),'Starting\n   5/   5 sec '+'.'.repeat(60)+'~~(,_,\"> yum!\nDone\n');
 assert.equal(terminalText('one\r\ntwo\n'),'one\ntwo\n');
 assert.equal(terminalText('abcdef\rxy'),'xycdef');
});
test('Log text supports backspace, ANSI erase and cursor movement without HTML interpretation',()=>{
 assert.equal(terminalText('abc\bX'),'abX');
 assert.equal(terminalText('abcdef\rxy\x1b[K'),'xy');
 assert.equal(terminalText('abcdef\x1b[2K\rHi'),'Hi');
 assert.equal(terminalText('abc\x1b[2DX'),'aXc');
 assert.equal(terminalText('abc\x1b[1GZ'),'Zbc');
 assert.equal(terminalText('a\tb'),'a       b');
 assert.equal(terminalText('\x1b[31mERROR\x1b[0m <script>'),'ERROR <script>');
 assert.equal(terminalText('ok\x1b[31'),'ok');
 assert.equal(terminalText('\x1b]0;title\x07hello'),'hello');
 assert.equal(terminalText('\x1b[999999999Ctext'),'');
});
