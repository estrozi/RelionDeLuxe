import fs from 'node:fs/promises';
import path from 'node:path';
import {constants} from 'node:fs';
import {jobPath,readablePath} from './paths.mjs';
export async function browserSelectionNote(project,name,preview,viewer='gallery.html'){
 const dir=await readablePath(project,[],jobPath(project,name));
 const commands=(preview.commands?.length?preview.commands:[preview.command]).filter(c=>typeof c==='string'&&c.trim());
 if(!commands.length)throw Error('Native preview did not provide a selection command');
 const source=preview.jobName;
 const text=commands.map(c=>source&&source!==name?c.split(source).join(name):c).join('\n');
 const note='\n ++++ Executing browser selection on '+new Date().toString()+'\n ++++ with the following equivalent native command(s):\n'+text+'\n +++\n # RelionDeLuxe: interactive selection is performed in '+viewer+'.\n # The native command above is recorded for provenance; it was not executed.\n';
 const file=await fs.open(path.join(dir,'note.txt'),constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o644);
 try{await file.writeFile(note);}finally{await file.close();}
}
