// Return text segments rather than HTML: stdout must never be interpreted as markup.
export function iterationLogParts(text, job, type, kind, availableFiles=null){
 if(kind!=='stdout'||!['3D auto-refine','2D classification','3D initial reference'].includes(type)||!['Running','Succeeded','Failed','Aborted'].includes(job?.status))return [{text}];
 const parts=[];let offset=0;
 const pattern=type!=='3D auto-refine'?/^(?:[ \t]*)(?:Expectation iteration|Gradient optimisation iteration|Stochastic gradient descent iteration|SGD iteration)[ \t]+(\d+)\b/gm:/Auto-refine: Iteration=\s*(\d+)\b/g;
 for(const match of text.matchAll(pattern)){
  parts.push({text:text.slice(offset,match.index)});
  const iteration=String(Number(match[1])).padStart(3,'0');
  const part=type==='2D classification'?{text:match[0],file:`${job.name}run_it${iteration}_optimiser.star`,viewer:'gallery'}:{text:match[0],file:`${job.name}run_it${iteration}_${type==='3D initial reference'?'':'half1_'}class001.mrc`};
  parts.push(availableFiles&&!availableFiles.includes(part.file)?{text:part.text}:part);
  offset=match.index+match[0].length;
 }
 parts.push({text:text.slice(offset)});return parts;
}
