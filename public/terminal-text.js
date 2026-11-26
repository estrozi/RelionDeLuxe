// Plain-text, single-line terminal updates for bounded stdout/stderr snapshots.
// Not a full screen terminal emulator. Never emits HTML or executes escape codes.
export function terminalText(text){
 const lines=[];let line=[],column=0;const maxColumn=16384;
 const move=n=>{column=Math.min(maxColumn,Math.max(0,n));};
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='\r'){column=0;continue;}
  if(ch==='\n'){lines.push(line.join(''));line=[];column=0;continue;}
  if(ch==='\b'){move(column-1);continue;}
  if(ch==='\t'){move((Math.floor(column/8)+1)*8);continue;}
  if(ch==='\x1b'){
   if(text[i+1]==='['){
    let end=i+2;while(end<text.length&&!/[@-~]/.test(text[end]))end++;
    if(end===text.length)break; // Incomplete escape at the current end of the log.
    const params=text.slice(i+2,end),command=text[end];i=end;
    if(!/^[0-9;]*$/.test(params))continue;
    const n=Number(params.split(';')[0]||0);
    if(command==='K'){
     if(n===0)line.length=Math.min(line.length,column);
     else if(n===1){for(let c=0;c<=column&&c<maxColumn;c++)line[c]=' ';}
     else if(n===2)line=[];
    }else if(command==='G')move((n||1)-1);
    else if(command==='C')move(column+(n||1));
    else if(command==='D')move(column-(n||1));
    // SGR styling and unsupported screen controls are discarded.
   }else if(text[i+1]===']'){
    // Ignore terminal titles/hyperlink controls, including incomplete sequences.
    i+=2;while(i<text.length&&text[i]!=='\x07'&&!(text[i]==='\x1b'&&text[i+1]==='\\'))i++;
    if(text[i]==='\x1b')i++;
   }else{i++;}
   continue;
  }
  if(ch<' '||ch==='\x7f')continue;
  const code=text.codePointAt(i),character=String.fromCodePoint(code);if(code>0xffff)i++;
  if(column<maxColumn){while(line.length<column)line.push(' ');line[column++]=character;}
 }
 lines.push(line.join(''));return lines.join('\n');
}
