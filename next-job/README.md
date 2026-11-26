# Customizable next-job buttons

Definitions are organized as `next-job/SPA/<output-folder>/` and
`next-job/STA/<output-folder>/`, for example `next-job/SPA/Select/`.
The installation contains a starter set. On the first writable opening of an
initialized RELION project, it is copied into that project's `next-job` folder.
Existing project folders are never replaced: edits, additions and removals survive
upgrades. Reload the browser after editing definitions. To restore the starter set,
back up your project copy and copy the installation's folder over it yourself.

Each JSON file contributes one button, ordered alphabetically by filename. Empty
folders contribute none. Definitions with unmet conditions are hidden. The usual
selection, read-only and executable checks still apply. Bad JSON is reported
without preventing valid definitions from loading.

## A simple button

For example, add `SPA/Select/40-classify.json`:

```json
{
  "format": "RelionDeLuxe.next-job",
  "version": 1,
  "source": "relion.select",
  "action": "draft",
  "target": "relion.class3d",
  "label": "Add next job: 3D classification",
  "values": {"nr_classes": "3"}
}
```

`target` is the job's RELION type label (or its GUI name). `values` is optional;
all values are strings. Normal next-job input inheritance is applied first, then
these explicit overrides. The result is an editable draft, not a submitted job.
`source` is optional except when types share a folder (e.g. Screening and External).
Use the supplied files as examples of exact type labels for each mode.

Optional `when` conditions accept `all`, `any`, `not`, or a `field` with `equals`,
`in`, `contains`, or `empty`. Fields refer to saved `job` properties, editor `values`,
or derived `context` properties. For example:

```json
"when": {"field": "values.do_cryocare_train", "equals": "Yes"}
```

Derived context fields are `refinementMask`, `importMovies`, `topazTraining` and
`subset3D` and `nearNyquist` (the same 10% threshold used for the red refinement resolution marker). See the starter definitions for combinations. JSON never executes code.

## Idealized pipelines

Put an exported idealized-pipeline JSON directly in the relevant folder. Its mode
must match SPA/STA. A single fresh step creates an ordinary draft; multiple steps
(or a continuation) create pinned drafts with a triple-circle button. External
inputs can be reviewed before creating drafts. Usual validation and scheduling
checks remain in place.

Optional top-level `nextJob` metadata can specify `label`, `source`, `when`, and
`optionalInputs` (an array of input names). The supplied SPA PostProcess sequence
also uses `"binding": "postprocess"`: this specialized binding fills the six inputs
of that particular recipe from the selected finished Post-processing job and its
upstream refinement. Use this binding only for recipes following that same input
contract. Other templates present their saved input bindings for review.

## Continuations

The starter set includes `action: "continue-manual"` for finished non-training
Auto-picking jobs and `action: "continue-with-mask"` for eligible Mask creation
jobs. These retain their original eligibility checks and continue existing jobs;
they do not create new job numbers. Other simple buttons use `action: "draft"`.

Numeric `atMost` conditions compare finite positive numbers, e.g. `job.resolutionAngstrom` at 3 Å or better.

`context.hasCompleted3DJob` is true if any 3D initial reference, 3D classification, or 3D auto-refine job in the project has succeeded. Use `{"field":"context.hasCompleted3DJob","equals":true}`.
