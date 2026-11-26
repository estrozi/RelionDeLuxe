# RELION analysis and RelionDeLuxe implementation boundary

Analysis updated: 28 September 2026. Target: single-particle analysis in RELION 5.0.1, using the user's release-5.0 tutorial. Tomography is excluded.

## Findings that determine the design

RELION's main window is a project-oriented process console. The browser replacement must preserve job identity, settings, continuation semantics, input/output edges and status; reproducing the visual form alone is insufficient. The job directory is part of the scientific record, not a disposable frontend task identifier.

The source has useful separation:

| Official component | Responsibility | RelionDeLuxe treatment |
|---|---|---|
| `gui_mainwindow.cpp` | Job browser, status lists, actions, I/O selection and logs | Browser control console |
| `gui_jobwindow.cpp` | Tabs, field order, grouped activation, continuation activation | Extracted layout metadata plus browser renderer |
| `pipeline_jobs.h/.cpp` | Job definitions, defaults, help, choices, command generation, queue script generation | Actual upstream C++ code, compiled into a small metadata/pipeline adapter |
| `pipeliner.h/.cpp` | Process/node graph, job numbering, pipeline locking, launch and lifecycle | Actual upstream C++ implementation |
| `apps/pipeliner.cpp` | CLI scheduling and limited pipeline operations | Used for batch scheduler execution |
| Native scientific executables and third-party programs | Reconstruction, motion correction, CTF estimation, picking and other work | Installed distribution, unchanged |

The inspected code is pinned to [RELION revision 210f68c](https://github.com/3dem/relion/tree/210f68c865b28e6806c6b721f1a6ed3374c788d2). The main reference files are [GUI job windows](https://github.com/3dem/relion/blob/210f68c865b28e6806c6b721f1a6ed3374c788d2/src/gui_jobwindow.cpp), [job definitions](https://github.com/3dem/relion/blob/210f68c865b28e6806c6b721f1a6ed3374c788d2/src/pipeline_jobs.cpp), [pipeline implementation](https://github.com/3dem/relion/blob/210f68c865b28e6806c6b721f1a6ed3374c788d2/src/pipeliner.cpp) and [pipeliner CLI](https://github.com/3dem/relion/blob/210f68c865b28e6806c6b721f1a6ed3374c788d2/src/apps/pipeliner.cpp).

The stock pipeliner CLI supports adding scheduled jobs, editing settings, checking completion, cleanup and running schedules, but it does not expose every main-window operation. In particular, treating `--addJobFromStar` as a continuation would be wrong: that path resets the continuation flag and adds a scheduled job. The bridge therefore calls `PipeLine::runJob` with the same new/continue/scheduled distinctions used by the GUI.

## Architecture

Browser → local Node.js HTTP service → native metadata/pipeline bridge → original RELION executables.

There is one authoritative pipeline: `default_pipeline.star` and the normal RELION job directories. The service has no independent job-status database. It queries native state and asks RELION to update completion state from the original control markers. Browser refreshes never infer success from the mere presence of a log or from a subprocess accepting a command.

New settings travel through a short-lived `job.star` in `.reliondeluxe/`. The native API reads those settings, generates commands, and handles the normal job files. The adapter also exposes a nonexecuting command preview. Queue templates and environment-dependent fields remain under RELION's control.

The frontend uses standard browser ES modules and CSS variables; the backend uses Node.js built-ins. This keeps the first workstation install free of npm runtime dependencies. The interfaces separate rendering, HTTP and native execution so a future React/Vue/Svelte view layer would not affect scientific behavior.

## What the SPA tutorial requires from the GUI

The [official SPA tutorial](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/index.html) is a strong acceptance-test route because it exercises reusable jobs, file/node selection, visual inspection and iterative processing. It is not simply a linear wizard.

| Tutorial stage | GUI behavior that must be preserved | Implementation / next verification |
|---|---|---|
| Import, motion correction and CTF estimation | Relative project paths and wildcards, optics fields, MPI/thread settings, output nodes and logs | Forms, native command generation and pipeline operations implemented; replay on actual tutorial data pending |
| Manual picking, LoG and Topaz picking | Different method parameters and native interactive picking | All fields and original tools retained; browser-native picking not included |
| Extraction, 2D classification and subset selection | Correct particle STAR inputs, algorithm-specific settings, repeated classification and selection | All forms included; inspect actual class-selection handoff on workstation |
| Initial 3D model, classification and refinement | Reference inputs, sampling, compute options, continuation settings and half-map outputs | Native command builders used; scientific runs pending |
| Mask creation and post-processing | Maps, masks and relationships to refinement outputs | Fields/nodes retained; integrated map rendering pending |
| CTF refinement and polishing | Inputs from multiple prior jobs and iterative re-refinement | Native settings retained; richer cross-job preflight pending |
| Local resolution, ModelAngelo and DynaMight | Specialized outputs and external dependencies | Job forms included; dependencies and viewers must be verified locally |

The [preprocessing instructions](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/Preprocessing.html) establish the project directory as the working directory and use Import output as Motion correction input, then corrected micrographs as CTF input. They also show why external-data symlinks and workstation file browsing matter. RELION's own motion correction is CPU-threaded, whereas its wrapper for MotionCor2 has different requirements. These distinctions must not be replaced by a single global “use GPU” toggle.

The [2D classification tutorial](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/Class2D.html) gives a concrete future validator: VDAM is incompatible with MPI parallelization. It also uses optimizer metadata for continuation and selection. A browser GUI must not treat every particle STAR file as interchangeable with optimizer metadata.

The [refinement tutorial](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/Refine3D.html) revisits extraction using selected particles and changed sampling. The [mask/post-processing chapter](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/Mask.html) and [polishing chapter](https://relion.readthedocs.io/en/release-5.0/SPA_tutorial/Polish.html) further require branching and returning to earlier processing stages. This supports retaining an open job console for the first iteration.

## Coverage of version 0.3.0

| Capability | State in 0.3.0 |
|---|---|
| 22 SPA job types; source-derived option labels/defaults/help/choices | Implemented; 657 bundled definitions matched native initialization exactly in the clean test environment |
| Original job-specific tabs plus Running | Implemented; 98 rendered tabs including Other options fallbacks |
| New-job and continuation field activation; boolean groups | Extracted from source; major behavior tested, full visual/behavioral parity audit still required |
| Runtime RELION environment defaults and queue extras | Native initialization supplies them |
| Combined two-/three-field rows | Separate labeled fields; no parameter is omitted |
| Light / dark | Implemented; current browser rerun blocked by environment |
| Create project, new job, direct run, schedule, continue | Native adapter implemented; actual native lifecycle tested with an external test job |
| Run scheduled job in its existing directory | Implemented and native-tested |
| Batch/repeated scheduler | Native CLI launch implemented; full repeated/cluster scheduler acceptance pending |
| Status lists, error/abort states, refresh | Native state and completion checking |
| Raw stdout, stderr, note, submission script | Last 128 KiB exposed as text; complete files remain on disk |
| Aliases and notes | Implemented; aliases deliberately restrict characters |
| Inputs/outputs | Actual native graph nodes |
| Input-node-aware file browsing | Native registered-type and filename filtering implemented; full STAR-column validation pending |
| Abort | RELION cooperative marker, not forced process/queue cancellation |
| Mark finished / failed | Native API; does not stop a running process |
| Gentle/harsh cleanup | Native API; destructive action confirmation, running jobs rejected |
| Delete | Native Trash operation; optional recursive downstream scope, previewed and confirmed |
| Recursive deletion / undelete | Implemented and native-tested, including branching graphs and external upstream inputs |
| Overwrite | Pending |
| Native image/PDF display | Generic desktop handoff; specialized FLTK display arguments remain incomplete |
| Browser MRC viewer / class selection / manual picking | Pending; original native tools retained |
| Schemes, pipeline import/export and named pipelines | Pending; only `default_pipeline.star` supported |
| New comprehensive preflight engine | Pending; native command validation and basic field checks present |
| Tomography / CCPEM-pipeliner backend | Excluded |

## Validation design for the next iteration

The next layer should emit structured findings containing severity, implicated field IDs, a reason and a suggested correction. It should run on the server both for preview and submission, with the same rule set. UI hints alone are not enforcement.

Keep four classes distinct:

1. **Representation checks:** finite numbers, booleans, enum choices, readable paths, required inputs. These must respect disabled branches and RELION sentinel values such as `-1`.
2. **Native hard constraints:** incompatible algorithm choices, VDAM/MPI restrictions, supported precision/implementation combinations. Reuse native checks or create tests against the native command builder before mirroring them.
3. **Environment checks:** executable availability, queue template readability, requested devices, thread/MPI configuration and filesystem space. These require observations from the actual workstation.
4. **Cross-job compatibility and advisory checks:** upstream output types, optics groups, sampling, masks and input provenance. Advice about scientific quality must not silently become a blocking rule.

Do not globally reinterpret numeric slider ranges as constraints: a GUI range may be only an interaction convenience. Do not “correct” a value automatically just because it looks unusual. Scheduling also needs different path checks from immediate execution, because a valid scheduled job may depend on an upstream output that does not exist yet.

## Next acceptance milestone

Use a copied tutorial project, compare the same populated forms and generated commands in FLTK and RelionDeLuxe, then run the tutorial through native mode. Record exact RELION version/build, GPU and queue environment. Close the browser and reopen it during a long job; confirm job identity and state persist through the native pipeline. Verify original native viewers, continuation from optimizer files, MPI/GPU combinations and cluster submission. Only after those checks should this be presented as a day-to-day GUI replacement.


## 0.2.0 implementation notes

The gray theme and its assets were removed. Previously saved gray preferences migrate to light. The native adapter auto-resolves from PATH or the package build directory. Per-job native previews supply executable-resolution checks; the application never evaluates the preview text to discover binaries. Actual execution still uses RELION's unchanged command builder and launcher, preserving MPI and queue semantics.

Deletion uses `deleteJobGetNodesAndProcesses` for the scope and `deleteNodesAndProcesses` for the operation. Restoration uses `undeleteJob`. Because the deleted mini-pipeline omits nodes still owned by an active upstream producer, the adapter preserves the original input-edge table and reattaches those edges afterward with `addNewInputEdge` under RELION's normal lock. A native integration test compares the complete graph before deletion and after restoration. Plans read Trash process metadata through `MetaDataTable`, avoiding mini-pipeline reads that could create alias symlinks during preview.

## 0.3.0 input browsing

The picker now mirrors `GuiEntry::cb_browse_node_i` in `src/gui_entries.cpp` and `PipeLine::touchTemporaryNodeFile` in `src/pipeliner.cpp`. Input-node fields select `.Nodes/<node-type-prefix>` using the original `node_type_depth`; marker paths resolve aliases to canonical registered pipeline nodes. File patterns are applied as well. The picker never reads an empty marker as STAR data. Scheduled/running missing outputs are labeled expected, completed missing outputs are omitted, and stale/unregistered/type-mismatched entries are omitted. Ordinary file fields retain a format-filtered filesystem picker.

The schema now exports `nodeDepth`; rebuild the adapter when upgrading. Bounded scans return a partial-result notice. No new dependency or pipeline database is introduced. This supplies the native GUI's category filtering, not exhaustive STAR column validation.

## 0.5.0 helical-reference integration decision

Inspected the pinned upstream `src/helix_inimodel2d.cpp`, `src/apps/helix_inimodel2d.cpp`, `src/args.cpp`, `src/pipeline_control.cpp`, `src/pipeline_jobs.cpp` and `src/pipeliner.cpp`. The shared parser accepts `--pipeline_control`; the executable exits through RELION's success/failure hooks, but the helical calculation loop contains no abort-marker checks. Its parser has `--iniref`, not `/ini`. With one default class, `reconstruct3D()` writes `<prefix>_class001_rec3d.mrc`.

Chosen design: register a supported External process using the native addJob/read/write APIs, allocate the requested directory from the native counter under its lock, and pre-register the class-average input and density-map output. Subsequent launch/scheduling uses the unchanged runJob implementation. A Node.js launcher translates External arguments into the requested scientific command and observes aborts. The UI exposes a virtual add-on type; the on-disk type remains the supported External type. The original GUI and scheduler can read its job.star and pipeline records. No scientific implementation is forked.

The launcher must remain installed at the path recorded in job.star. As with other mutations in this preview, use one active writer for a project. Registration/launch and multi-file filesystem operations are not transactional across crashes. This job supports local CPU execution, scheduling, and rerun in place, not queue/MPI settings or optimiser checkpoint continuation.
