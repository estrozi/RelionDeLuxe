# Concrete history and idealized recipes

A concrete pipeline belongs to one RELION project: numbered directories, registered nodes, statuses and accumulated input/output edges. An idealized pipeline is a versioned recipe containing job types, parameters, symbolic dependencies and externally bound inputs. It has no execution statuses. Each instantiation creates a new concrete set of Scheduled jobs through the official pipeline adapter.

## The supplied default_pipeline.star

The attachment contains 27 processes: 25 Succeeded and 2 Failed (`CtfRefine/job024/`, `Polish/job037/`). Its edges still include absent `CtfRefine/job031/` feeding job024, and failed job037 feeding job038 alongside successful replacement `Polish/job044/`. The successful dependency job044 → job038 is also a counterexample to sorting the recipe by historical job number. Dependency order is required instead.

These edges are history, not an unambiguous recipe. The STAR does not store complete parameter values or say which prior invocation of a continued job produced which intermediate file. The application therefore captures saved `job.star` values from the open project, not a blind transitive copy of historical edges. It never guesses that one failed job should be replaced by another successful job.

Capture excludes failed jobs by default. Selecting failed/running/aborted jobs explicitly is rejected. A reference outside the selected set becomes an external binding when it is in a file field. Its concrete default is retained for review, not silently redirected. Conditionally disabled file inputs are cleared before bindings or dependencies are generated, including inactive Import inputs and queue submission scripts. Shared inputs remain bound wherever an enabled field still needs them. This applies to new captures; re-capture to clean an older template. Internal paths (including aliases and project-absolute paths) become symbolic references. The specific refinement/mask feedback pair is unfolded as described below. Other unresolved cycles return an editable capture draft, but validation and scheduling reject them. Ordinary fresh steps clear Continue-from-here; clone continuation steps retain an explicit source checkpoint.

## Recipe format

Export format is `RelionDeLuxe.ideal-pipeline`, version 1. `name` is a display name; `inputs` is a dictionary of external values. `steps` contains `id`, `type` (official layout label), `directory` (native output directory), and `values` (job option strings). `title` is optional. Dependencies are derived from symbolic references, not trusted from imported metadata.

`${jobN}` expands to the whole concrete output directory, including the trailing slash. For example `${jobN}particles.star` may become `Extract/job052/particles.star`. `${input:particles}` expands to the value bound to `inputs.particles`. Validation topologically orders steps and normalizes their IDs to jobN, jobN+1, etc. Exported recipes include binding defaults; review paths before sharing or using another project.

The step editor provides ordinary parameter fields grouped by the existing job tabs. Advanced JSON editing supports changing the graph, adding/removing steps, and changing bindings. It is not yet a drag-and-drop graph editor or RELION Scheme implementation.

## Instantiation and checks

Preview validates the graph and option types, resolves native directories and paths, applies project computing defaults, checks existing inputs/STAR columns and duplicate executions, and reports pending upstream outputs. No pipeline processes are registered by preview. RELION dry runs all use its current counter: later command previews explicitly label that provisional output number; the destination mapping shows the actual planned number. Actual scheduling regenerates each command with its allocated number.

Confirmation is tied to a server-side preview that expires after five minutes. The pipeline, settings, effective values and verification report are checked again. Active scheduler markers block instantiation. Native allocation is checked at each step. After registration, jobs appear in the normal pipeline panel and are operated by the existing native scheduler.

This is staged batch creation, not an atomic multi-job RELION transaction. If an error occurs after some jobs were registered, the message lists completed creations. Existing jobs remain intact; inspect the listed Scheduled jobs before retrying. Other native GUIs can still mutate the pipeline concurrently; do not run another writer during batch creation. Mismatched allocation aborts subsequent steps and reports created jobs.

## Limits of replay

An acyclic recipe is structurally idealized; it cannot guarantee scientific success. Missing external inputs and incomplete column profiles remain warnings requiring review. Future files cannot be inspected until produced. Native command builders may themselves need an upstream file before a job can even be previewed; stage such a recipe at that boundary and bind the produced file before preparing its next part.

Iteration-specific filenames, input-dependent outputs and manually selected classes require review. Replaying final saved settings is not a reconstruction of every continuation or interactive decision in the history. Manual picking or interactive selection can still require an operator. Ordinary steps start fresh from saved settings; clone continuations reuse the explicitly recorded checkpoint. Only the mask feedback pattern below is automatically unfolded. Arbitrary cycles and failed-dependency substitutions are not inferred.

The helical add-on supports planning a future `class_averages.star` input; actual registration still checks the native node type. All scientific calculations remain in the installed RELION executables. The template layer does not implement its own execution engine.

## Mask feedback: A → B → C

Supported A types are `relion.refine3d` and `relion.class3d`. A's `fn_mask` must reference B's `mask.mrc`, and B must be `relion.maskcreate` with `fn_in` pointing to a map in A. The transformation creates an independent clone C, clears the mask on A, disables solvent-corrected FSC on the unmasked auto-refine phase, and preserves the mask/settings on C. Other existing downstream references to A are redirected to C. The mask step stays attached to the unmasked phase. Remaining complex cycles are rejected. Additional arguments that override `--solvent_mask`, `--continue` or `--o` block unfolding until corrected.

The checkpoint basename must be `run_itNNN_optimiser.star`. Capture preserves the original self-checkpoint for this purpose. An iteration-specific mask input can supply its iteration if no checkpoint was recorded. A graph-only export with neither does not contain enough information: add `captureCheckpoint` to A's JSON, using the intended numbered optimiser, then validate. This value is consumed during unfolding. The resulting continuation metadata is:

```json
"continuation": {"source": "jobN", "checkpoint": "run_it020_optimiser.star"}
```

The continued step's `fn_cont` is `${jobN}run_it020_optimiser.star`. Its checkpoint can be edited in the template step dialog. For classification, A's `nr_iter` becomes 20 in this example; an iteration-specific mask map is adjusted to the initial iteration, and C's final iteration target must be greater than 20. Iteration-specific downstream filenames should still be reviewed when changing iteration targets manually.

The native bridge registers C in its normal `Refine3D` or `Class3D` directory with `_rlnJobIsContinue=1`, official commands/output nodes, a source-checkpoint input edge, and alias `CloneContJobNNN`. The stock RELION scheduler can execute A, B and C in order, including queued jobs. Re-saving a scheduled continuation preserves its flag rather than silently turning it into a fresh run. Capturing these separate processes preserves the continuation relationship.

No result directory is copied. RELION's optimiser reader consumes A's model/data/sampling files, while its `--o` option directs new results into C. This saves space without writable symlink aliases to old output files. Do not clean or delete the source checkpoints or the files they reference before running C. The registered dependency participates in native Trash planning.

This is not an exact replay of undocumented historical settings. A inherits the final saved settings except the explicit mask/FSC/iteration changes above. Review any original sampling or reference differences. On a new dataset, auto-refinement can converge at a different iteration; the specified checkpoint must actually be produced. This release does not choose a future latest checkpoint dynamically or rewrite scientific checkpoint contents. The native scheduler's normal behavior is to wait for missing input nodes; stop it and correct the checkpoint if the initial run did not produce that iteration. A converged `run_optimiser.star` is not silently substituted for a numbered checkpoint.
