import {topazTrainingGpu} from '../public/workstation-defaults.js';
// JSON -> RELION job.star; scientific command generation remains native.
export function starValue(value) {
  const s = String(value);
  if (/[\r\n\0]/.test(s)) throw new Error('Job options must be single-line strings.');
  if (!s.includes("'")) return `'${s}'`;
  if (!s.includes('"')) return `"${s}"`;
  throw new Error('A value cannot contain both single and double quotes in this initial STAR writer.');
}
export function validateValues(schema, values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Expected job values');
  const definitions = new Map(schema.options.map(f => [f.key, f]));
  const normalized = {};
  for (const [key, value] of Object.entries(values)) {
    const field = definitions.get(key);
    if (!field) {
      if(['binning','box_size','crop_size','do_stack2d'].includes(key)&&definitions.has('subtomo_format'))throw new Error(`RELION 5.0 extraction option ${key} is not supported by this 5.1 bridge. Review box_size_angst, precrop_size_angst, binned_size_pix and subtomo_format; old pixel dimensions cannot be reused as Angstroms.`);
      throw new Error(`Unknown option: ${key}`);
    }
    if (typeof value !== 'string' || value.length > 16384) throw new Error(`Invalid value for ${key}`);
    starValue(value);
    if (field.type === 5 && !['Yes', 'No'].includes(value)) throw new Error(`${field.label} must be Yes or No`);
    if (field.type === 4 && !field.choices.includes(value)) throw new Error(`${field.label}: choose a listed value`);
    // RELION slider bounds are UI suggestions, not scientific validity ranges.
    if (field.type === 6 && (value.trim() === '' || !Number.isFinite(Number(value)))) throw new Error(`${field.label} must be a finite number`);
    normalized[key] = value;
  }
  return normalized;
}
export function validateAlignmentGpu(layout,values){
 if(layout.name==='Align tilt-series'&&values.do_aretomo2==='Yes'&&!String(values.gpu_ids??'').trim())
  throw Error('Which GPUs to use for AreTomo (gpu_ids, IMOD/AreTomo2 tab) must not be empty. Enter an explicit GPU ID, for example 0. This avoids a RELION command-generation bug with empty GPU selections.');
}
export function settingsStar(layout, schema, values) {
  const v = validateValues(schema, values);
  validateAlignmentGpu(layout,{...Object.fromEntries(schema.options.map(f=>[f.key,f.default])),...v});
  topazTrainingGpu(layout,v);
  return `data_job\n_rlnJobTypeLabel ${starValue(layout.label)}\n_rlnJobIsContinue 0\n_rlnJobIsTomo ${layout.isTomo?1:0}\n\ndata_joboptions_values\nloop_\n_rlnJobOptionVariable #1\n_rlnJobOptionValue #2\n` +
    Object.entries(v).map(([k, value]) => `${k} ${starValue(value)}`).join('\n') + '\n';
}
export function validateAlias(alias) {
  if (typeof alias !== 'string' || !/^[A-Za-z0-9_.-]{0,100}$/.test(alias) || ['.', '..', 'None'].includes(alias)) throw new Error('Alias: use letters, digits, underscores, hyphens or dots (up to 100 characters).');
  return alias;
}
