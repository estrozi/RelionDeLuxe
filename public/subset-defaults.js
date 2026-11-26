// Class-based selection must not inherit unrelated subset operations.
// Resource settings (the generated Running tab) are deliberately independent.
export function classSelectionDefaults(layout,schema,values){
 if(layout.name!=='Subset selection'||!String(values.fn_model||'').trim())return values;
 const classKeys=new Set(layout.tabs?.['Class options']||[]);
 const otherKeys=new Set(Object.entries(layout.tabs||{}).filter(([tab])=>tab!=='Class options'&&tab!=='Running').flatMap(([,keys])=>keys));
 for(const field of schema.options)if(field.type===5&&otherKeys.has(field.key)&&!classKeys.has(field.key))values[field.key]='No';
 return values;
}
