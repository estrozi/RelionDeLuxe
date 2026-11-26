# Verification record

Target source: RELION `ver5.0`, commit `210f68c865b28e6806c6b721f1a6ed3374c788d2`, version 5.0.1. Verification date: 28 September 2026.

## Passed in this workspace

- Compiled the native adapter with the actual upstream pipeline/job/metadata source files using Linux `g++`, without rebuilding scientific engines.
- Compared all 22 native schema objects and 657 option definitions to the extracted bundled catalog. The complete JSON objects matched in the clean environment.
- Twenty-four automated test cases passed with zero failures and zero skips when the native bridge was supplied.
- Native pipeline test: initialize a temporary project, preview without registering a job, schedule, run in place, read settings, capture real stdout/stderr, continue without duplicating the job, change alias, mark failed and abort a cooperative external test executable. RELION released its lock afterward. Native command generation rejected an invalid Import mode combination.
- HTTP test: token requirement, origin/Host protection, request validation, concurrent duplicate submission suppression and content security policy.
- File handling: external symlink rejection unless explicitly allowed, traversal containment, bounded tail reads, canonical job paths and restricted aliases.
- Version 0.1.0 passed Chromium rendering checks for all 22 job types and 98 tabs. The updated browser regression script covers two themes, gray-preference migration recursive deletion/restore and field-specific input selection, but could not run in this session: the available Chromium terminated at startup with SIGTRAP before loading the application. These updated UI flows still need workstation verification.
- Native Trash tests cover a branching dependency graph, restoration of settings/aliases and preserved external input edges, stale confirmations, running descendants, destination collisions and existing Trash copies.
- PATH tests use instrumented `relion_import` and `relion_refine` fixture executables to verify command arguments, output capture and lifecycle signals. Missing binaries block local Run before registering a job. These fixtures do not perform cryo-EM computations.
- New input tests verify native marker generation, alias-to-canonical resolution, separate movie/micrograph lists, expected scheduled outputs, stale/missing entries, subtype depth, file patterns, protected read roots and updates after deletion/restore. HTTP tests exercise field-bound selection and reject non-file fields.
- No new screenshots are supplied for this release because Chromium could not start.

## Not verified here

No cryo-EM reconstruction, tutorial dataset processing, GPU computation, MPI compute job, real queue submission, Topaz/ModelAngelo/DynaMight execution, interactive native picking or scientific result viewer was executed. The external lifecycle test validates orchestration, not scientific numerical equivalence. Batch scheduler code and some job-action paths still require workstation acceptance.

## Workstation acceptance checklist

1. Match the RELION version and activate its usual environment. Build the adapter from the pinned source.
2. Start with a copied tutorial project and confirm that the original GUI can still read it before and after browser operations.
3. Compare job settings and native command previews for every tutorial step, including local/MPI/GPU and queue configurations.
4. Execute Import → Motion correction → CTF estimation; inspect logs and graph nodes in both GUIs.
5. Exercise manual picking and subset selection using the workstation's original interactive tools.
6. Continue a completed or interrupted refinement from the appropriate optimizer metadata. Confirm job identity, output directory and command semantics.
7. Run the remaining tutorial stages and compare expected outputs, without treating floating-point bit identity as the default GPU acceptance criterion.
8. Verify abort, failed executables, missing inputs, queue rejection, partial logs, browser reconnect and server restart.
9. Test repeated scheduling and downstream inputs that appear later. Document scheduler cancellation behavior separately from job abort.
10. On disposable project copies, test cleanup and Trash actions. Compare recursive-delete/undelete against FLTK on a copied real tutorial project. Overwrite remains unavailable.

Useful commands are in the root README. Browser tests require Playwright only for development, not for running the application.

## 0.3.1 tab-selection fix

Reviewed the job-selection transition: the tab resets only when the loaded job has a different type. The existing editor fallback handles unavailable tabs. JavaScript syntax validation passed. Native code is unchanged; no additional native test run or browser verification is claimed for this small UI fix.

## 0.3.2 job-type tab fix

Removed the unconditional tab reset in the left-hand job-type selection handler. The editor preserves a tab by name and already falls back to the first available tab when necessary. JavaScript syntax validation passed. Native code and job-list selection behavior are unchanged. No new browser verification is claimed.

## 0.3.3 terminal-style log rendering

Inspected RELION’s progress output in `src/time.cpp`: each update begins with a carriage return and completion ends with a newline. Two renderer regression tests passed, covering successive mouse/cheese updates, completion, CRLF, shorter overwrites, backspace, tabs, ANSI line erasure and horizontal cursor controls, stripped styles/title sequences, incomplete escapes and bounded cursor movement. The existing HTTP regression test also passed; JavaScript syntax checks passed. Browser verification remains unavailable. Native code is unchanged.

## 0.3.4 native STAR viewer

Confirmed the `--gui` option in upstream `src/displayer.cpp`. A PATH-resolved fixture verified exact arguments (`--gui --i`), paths containing spaces, project working directory, captured startup failure/stderr, and absent display environment. Image/PDF command routing and the existing HTTP regression passed. JavaScript syntax checks passed. No actual RELION desktop window was opened here. The startup observation period is 750 ms; errors after that remain in the viewer log.

## 0.3.5 pause auto-refresh

Added a session-persistent pause/resume control and a visible paused status. Reviewed both asynchronous background response paths (pipeline and logs): a generation guard suppresses stale results and errors after pausing, including pause/resume during an in-flight request. Manual actions use the normal update path. JavaScript syntax validation passed; no new browser verification is claimed. Native execution code is unchanged.

## 0.4.0 multi-selection and batch Trash

Recompiled the adapter against the pinned RELION sources. All 19 automated tests passed with zero skips. Added modifier/range selection tests, authenticated HTTP batch preview/delete/undelete tests and native union-of-selections tests. Native checks cover unselected dependencies, selecting a parent and child together, overlapping recursive roots, running descendants, stale confirmation and one-manifest group restoration. Browser interaction and graphical appearance remain unverified in this environment.

## 0.4.1 Trash menu and extraction coordinates

All 21 automated tests passed with zero skips. New coverage verifies that Trash targets highlighted rows rather than the separately inspected job, with fallback when none are highlighted. Native Import command generation created the actual legacy coordinate node and hidden marker; the extraction picker accepted its `coords_suffix.box` output and alias, while rejecting it for the micrograph field. Tests also cover `.coords`, suffixed `.box`, modern STAR lists and rejection of arbitrary per-micrograph `.box` files. JavaScript syntax checks passed. Native code is unchanged from 0.4.0; browser interaction remains unverified here.

## 0.4.2 viewer notifications and continuation filtering — 29 September 2026

All 22 automated tests passed, with zero skips. Continuation tests cover exact pipeline job-type matching, early and later optimiser iterations, alias search, exclusion of non-optimiser files, unregistered directories and cross-type symlinks. JavaScript syntax checks passed. Reviewed the display endpoint’s success/error terminal logging and removal of viewer modal calls; no actual graphical window or browser interaction was verified here. Native code remains unchanged from 0.4.0.

## 0.4.3 classification continuation controls

Added tests for successful-run eligibility, retained success history, exclusion of new/running/scheduled and non-classification jobs, 2D/3D iteration-key mapping, decimal/exponent halving and invalid input. The I/O shortcut uses the same values object and field-enable rules as its original tab. JavaScript syntax validation passed. Browser rendering remains unverified in this environment.

## 0.4.4 full logs and adaptive inspector

Seven targeted core/HTTP tests passed. A new regression verifies exact UTF-8 log contents from beginning to end beyond the former 128 KiB cap. The bounded tail helper remains for viewer diagnostics but is no longer used by the inspector log endpoint. JavaScript syntax checks passed. CSS now stretches the log column and gives the scrollable pre the remaining column height; browser layout verification remains unavailable here.

## 0.5.0 helical add-on — 29 September 2026

The adapter was rebuilt from the pinned upstream sources. All 27 automated tests passed with zero skips before the final abort-callback guard; the helical tests were rerun after that guard. New tests cover layout placement/single tab/five fields, numeric validation, native global numbering, non-mutating preview, input and map-output node registration, saved parameter round-trip, stock External-job execution, exact scientific arguments including pipeline control, success/failure/abort, rerun without duplication, recursive Trash/restore, and missing-binary rejection without allocating a job. The worker is an instrumented fixture: it does not reconstruct a volume. Real helical numerical results, graphical rendering and a real queue/GPU job are not verified here.

## 0.5.1 extraction-derived mask defaults

Rebuilt the adapter against the pinned source. All 30 automated tests passed with zero skips. New tests cover 3D reference-resize overrides, nearest particle ancestry through selection/classification/re-extraction, exclusion of reference-map dependencies, multiple equally close extraction branches, the four-pixel formula, agreement/conflict across optics groups, and native STAR parsing with missing-file/column fallbacks. Browser syntax checks passed. Asynchronous response guards preserve manual values and saved jobs; actual browser interaction remains unverified here.

## 0.5.2 optional LAN binding

Added --host IPv4 binding, defaulting to 127.0.0.1. Wildcard binding prints local interface URLs, with a graceful fallback if interface enumeration fails. Host is restricted to the socket's local address (plus localhost for 127.0.0.1); API Origin must match the accepted Host. Token validation remains required. Two HTTP integration tests pass, including wildcard startup, token enforcement and rejected foreign Hosts/Origins. This sandbox blocks interface enumeration and alternate-address connectivity, so the wildcard test uses localhost here; actual cross-device LAN access remains to be checked on a workstation. Browser request IDs use getRandomValues (available on HTTP); copying logs has a fallback for browsers without the secure-context Clipboard API. JavaScript syntax checks pass. No native code changed.

## 0.5.3 helical Running tab

Two targeted tests pass against the compiled native bridge: layout has I/O and Running tabs with six total fields; additional arguments appear in preview, round-trip through saved native job settings and arrive as separate argv entries (including a single-quoted value with spaces) via stock External job execution. Existing rerun, failure, abort and Trash assertions pass. No native sources changed. Double quotes in additional arguments are rejected with guidance to use single quotes because RELION's native STAR writer does not round-trip embedded double quotes correctly. Browser rendering was not verified.

## 0.5.4 project execution defaults

Three targeted tests pass: authenticated defaults API readback and invalid-value rejection, existing HTTP/LAN guards, and persistence across settings instances, resetting, demo isolation, and validation of all seven supported keys. Project files use atomic replacement. Settings reject invalid positive integer resource counts and unknown fields, honor the read-only mutation guard, and only affect schema-supported fields. JavaScript syntax checks pass. Browser layout/interaction was not rendered in this environment.

## 0.5.5 computing settings precedence

Four targeted tests pass: persistence/validation, timestamp-based precedence for older versus subsequently saved job settings (including restart), demo precedence, and HTTP tests. Checkbox controls were replaced with a queue selector controlling its four dependent inputs; saving overwrites the current form and drafts. Job reads apply globals only when newer than job.star. Submission carries a project revision to reject stale browser settings. GUI scheduler startup resaves scheduled jobs with newer global settings before launching. No native rebuild needed; browser rendering was not verified.

## 0.6.0 NGL mask binarisation viewer

Five targeted tests passed across HTTP, map-preview and mask-viewer suites. Coverage includes tab placement and threshold relocation, map endpoint token checks and byte-for-byte streaming, path containment/read roots, rejected unsupported modes and incomplete/oversized dimensions, and slider/numeric-field synchronization to NGL absolute isolevel with disposal. The viewer unit test uses a stub NGL stage; it does not claim rendered mesh correctness. NGL 2.5.0's distributed parser and surface declarations were inspected to confirm mode and isolevel support. JavaScript syntax checks passed. Chromium launch was attempted with Playwright but crashed with SIGSEGV before opening a page, so visual rendering and actual GPU interaction remain unverified. No native reconstruction was performed or adapter source changed.

## 0.6.1 viewport refinement

Viewer unit test passes with assertions for orthographic stage creation, initial and threshold-update centering through NGL's task completion callback, live theme background updates and observer cleanup. App syntax check passes. CSS removes the Binarisation form height cap, allows the viewport to flex, and pushes the editor footer to its column bottom. Browser layout and actual WebGL rendering remain unverified in this environment.

## 0.6.2 duplicate execution alerts

Five targeted tests passed: command-block parsing and own-output-only normalization; parameter/history matching, alternate notes filename and exclusion of the current job; existing HTTP tests; and a real native RELION External-job lifecycle test extended to detect its recorded execution and reject a different thread count. The native test runs a harmless shell fixture, not scientific calculations. App/server syntax checks passed. New warning dialogs were not browser-rendered in this environment.

## 0.6.3 detached native launcher and fresh-job continuation reset

Two native integration tests passed. The new regression launches a harmless delayed External job through the real RELION bridge, sends SIGINT and SIGHUP separately to the entire launching backend process group, and verifies the child still writes RELION_JOB_EXIT_SUCCESS. The existing native lifecycle test also passes, covering launch, continuation, failure and Abort. No reconstruction programs were run. App syntax check passes; New job and Job Types paths clear fn_cont. Browser interaction was not rendered in this environment.

## 0.7.0 exact-number scheduled replacements

The native bridge was rebuilt against the pinned RELION source. The full suite passed 41 tests, zero skips/failures; an additional injected-copy-failure test then passed in the 3-test re-schedule suite. Tests used a disposable metadata copy of the attached project; the attachment was not modified and no reconstruction was run.

Verified jobs025–033 → jobs035–043 with N=10, job035 input job024 → job034, all per-job values equal to their originals except the previewed reference changes, shared job020 mask unchanged, replacement status Scheduled, counter 44, original directories in Trash, no new-job inputs referring to removed originals, and successful undelete of all nine originals. The failed job024's historical job031 input edge is retained. Validation also covers active-scheduler refusal, target directory collision, unselected scheduled dependents, stale preview/settings refusal, and a simulated failure after the first copy that leaves all originals intact and reports job035.

New menu/dialog code passed syntax checks. Browser rendering was not verified in this environment. Rescheduling is staged, not an atomic cross-filesystem transaction; partial-copy errors identify created replacements and leave originals untouched until every replacement is scheduled.

## 0.8.0 preflight verification and Samba

Native bridge rebuilt; all 46 tests pass with zero skips or failures. New coverage: higher-number dependency warnings; pending earlier outputs vs direct-run missing inputs; failed producers; fresh classification vs prediction-alignment requirements; conditional non-dose-weighted micrographs; real STAR block inspection and missing referenced stacks; and an HTTP warning returned before a missing-input job can be registered. Confirmed the supplied project's job024 → job031 dependency is detected. Viewer test includes Samba background changes; theme-selector browser test expectations updated. Browser rendering remains unverified in this environment. No scientific calculations ran.

The checker reports conservative column profiles and limitations rather than claiming exhaustive validation. Deferred outputs cannot be inspected until produced; the native scheduler is not replaced/intercepted at each internal job launch.

## 0.8.1 keyboard navigation and country themes

All 47 tests pass, with zero failures/skips, using the native bridge and disposable project fixture. Added selection tests cover movement, range extension/contraction across the anchor, boundaries, Home/End, Ctrl/Cmd focus-only movement and deleted anchors. Viewer tests cover Brazil and France backgrounds. App syntax check passes. Optional browser coverage now includes legacy theme migration, France selection, keyboard ranges and focus across refresh; it was not run in this release because Chromium startup previously failed in this environment. Interactive browser rendering/focus behavior still requires workstation verification. No native rebuild is required.

## 0.9.0 idealized pipelines

All 51 tests pass with zero failures/skips against the existing native bridge and disposable fixture. Added coverage verifies topological ordering and symbolic renumbering, cycles/missing bindings/unknown references/duplicate IDs, native preview without registration, dependency remapping, capture/export-style JSON round trips, reverse-order selection, computing-default changes invalidating previews, active scheduler refusal, partial-batch reporting, failed-job capture rejection, and the helical add-on following a future class-average selection. HTTP coverage verifies serving the new browser module, capture/plan/schedule integration, and refusal to reuse a consumed plan. Syntax checks pass for the server, app, template UI and template backend.

The attached default_pipeline.star was read without modification: 27 processes, 25 successful, two failed, an absent job031 dependency and retained failed job037 edge alongside replacement job044. No complete runnable template was fabricated from this graph-only attachment.

Chromium was attempted again for browser validation but crashed at startup with SIGSEGV, before a page could open. Visual layout and browser interaction therefore remain unverified in this environment. No scientific reconstruction ran; native tests registered disposable Scheduled jobs. No bridge rebuild required.

## 0.9.1 active-input capture

All 53 tests pass with zero failures/skips using the native bridge and disposable fixture. Added capture regressions cover disabled/enabled Import branches, queue scripts shared by active and inactive jobs, elimination of stale self-dependencies, nested conditions, schema defaults, retention of continuation-locked inputs, and unchanged original settings. No browser UI changes or native rebuild are involved.

## 0.10.0 mask feedback and native clone continuations

The native adapter was rebuilt against the pinned official RELION source. The full suite passed 58 tests with zero skips/failures. New tests cover unfolding auto-refine and classification feedback, initial mask/FSC removal, classification iteration and mask-map adjustment, downstream rewiring, missing/unsafe checkpoints, metadata validation, self-continuation capture, and idempotent template round trips. Native tests verify independent numbering, CloneContJobNNN aliases, registered checkpoint/mask dependencies, persisted continuation flags, resource-setting resaves, and recapture. An additional first-phase/checkpoint iteration guard is covered in the focused continuation suite.

A test harness invokes the unchanged official PipeLine::runScheduledJobs method. Both A → B → C sequences executed successfully through this stock scheduler using stand-in relion_refine and relion_mask_create programs. Recorded arguments confirm A has no mask, C uses A's checkpoint and B's mask, and C's output root is its own directory. Source checkpoint bytes remain unchanged. These are pipeline/command integration tests, not scientific reconstructions. The fixture project's Refine3D/job019 and MaskCreate/job020 were also captured read-only: they unfolded into three steps using run_it020_optimiser.star without modifying the project.

To reproduce stock-scheduler tests after building the bridge, compile test/stock-scheduler.cpp against the same build/*.o with the same source include directory and -Wl,--gc-sections, and set RELION_TEST_SCHEDULER to that harness executable. Without it, the tests exercise the bridge's scheduled-job launch path. Browser layout/WebGL testing remains unverified in this environment; JS syntax checks pass. The native adapter must be rebuilt; reconstruction engines are unchanged.

## 0.10.1 wildcard compatibility fix

All five focused pattern/preflight tests pass, including native STAR and HTTP pre-launch checks. The regression test explicitly disables fs.promises.glob and verifies wildcard, character-class, brace-alternative and recursive patterns, symlinked movie directories, symlink-cycle termination, dangling symlinks, hidden-file rules, exclusion of matching directory names, successful preflight matches and missing-match warnings. No native code changed. No scientific calculations or browser rendering tests were run for this backend-only fix.

## 0.10.2 configured external engines

Focused checks pass for absolute/project-relative/PATH executables, empty and missing paths, directory paths, missing execute permission, MotionCor2 activation, queued-worker wording, schema defaults and run/schedule/scheduler preflight reports. Existing non-HTTP preflight checks, including native STAR inspection, pass. The HTTP integration check could not start its server because this execution environment rejects local socket listening with EPERM; no HTTP/browser verification is claimed for this release. No external engine was executed and no native code changed.

## 0.10.3 MotionCor2 repair confirmation

Two focused tests pass: conflict detection with defaults, no mutation before acceptance, correct method/job-type gating, and a native command-builder regression reproducing the original float16 error then producing a valid MotionCor2 command after the proposed correction (including disabling summed power spectra when enabled). Preview registers no job. Server and browser JS syntax checks pass. Browser dialog interaction was not verified in this environment; local HTTP listening was blocked in the previous check. No scientific calculation or native rebuild is involved.


## 0.10.4 auto-picking controls

Passed focused auto-picking, configuration-fix and continuation-control test files, plus JavaScript syntax checks for app.js and server.mjs. Coverage includes all three picking methods and new, scheduled and continuation visibility contexts. Interactive browser verification was not performed in this environment.


## 0.10.5 polishing input regression

Passed polishing regression tests using the catalog's real fn_mic schema and an omitted preview input node, covering run/schedule/scheduler warnings, a valid metadata column, missing files and earlier scheduled outputs. Also passed the regression with the native STAR parser on synthetic STAR files, the existing non-native preflight tests and the preflight JavaScript syntax check. HTTP/browser integration and scientific calculations were not run.


## 0.11.0 standalone map viewer

Passed map-node classification/token-fragment tests, MRC header/path-boundary tests, and syntax checks of app, server and viewer modules. Extended HTTP tests cover authenticated original-byte downloads and viewer assets, but could not execute here because the environment denies listening on 127.0.0.1 (EPERM). Interactive WebGL rendering and PDB controls require workstation verification.


## 0.11.1 viewer controls

Verified clipNear/clipFar and scene-relative clipping against the bundled NGL implementation. JavaScript syntax checks passed for the main app and viewer. Interactive browser verification remains unavailable in this environment.


## 0.11.2 inspector layout

Reviewed desktop grid placement and responsive overrides against the existing HTML structure. This is a CSS-only layout change (plus release metadata); no pipeline logic changed. Interactive browser/layout verification remains pending because local server listening is unavailable in this environment.


## 0.11.3 pipeline scrolling

Reviewed the flex/grid sizing rules: the pipeline has a viewport maximum and zero automatic minimum, its job-list flex child can shrink and scroll, and its header/toolbar/footer do not shrink. CSS-only behavior change; interactive browser verification remains pending.


## 0.11.4 collapsible job sections

JavaScript syntax check passed. Reviewed focus restoration for both section toggles and job rows, and visible-row keyboard selection. Browser interaction verification remains pending.


## 0.12.0 gallery

Passed new STAR tokenizer/optimiser traversal and MRC slice tests, including quoted paths, multiline STAR values, malformed rows, class metadata, indexed float32 slices, float16 decoding, out-of-range indices, cycle rejection and read-root enforcement. Syntax checks passed for server, app, gallery backend and frontend. Orientation matrix order was checked against the bundled RELION source. HTTP/browser rendering and visual orientation fidelity remain unverified due to the environment's local-server restriction.


## 0.12.1 PDF viewer

JavaScript syntax checks passed for the PDF viewer, app and server. Reviewed authenticated file access, extension/signature checks and blob-frame CSP allowance. Browser PDF integration remains unverified in this environment.


## 0.12.2 micrograph gallery

All three gallery tests passed, including CTF column preference, metadata retention, MRC data with a .ctf:mrc reference and fallback to the micrograph column. App and gallery syntax checks passed. Interactive browser rendering remains unverified.


## 0.13.0 browser selection

Built the adapter against the pinned RELION source. Native integration tests passed for registering a running Select job without a viewer process, original class identity mapping with deliberately reordered class IDs, class/particle output creation, optics preservation, success state, invalid-index rejection, duplicate-save rejection, micrograph selection, persistence across refresh and abort rejection. Existing gallery tests and JavaScript syntax checks passed. Interactive HTTP/browser testing remains blocked by the environment's local-server restriction. Recentring/regrouping and scheduler browser activation are explicitly outside this release.


## 0.13.1 class-average block name

Rebuilt the native adapter and passed the browser-selection integration tests. The test explicitly requires an unnamed data_ line in class_averages.star, rejects data_model_classes in that output, and checks that the selected class row is retained.


## 0.14.0 manual picking

Rebuilt the native adapter against pinned RELION sources. Passed manual-picking integration tests for job registration, original image dimensions, optics pixel size, fractional coordinate round trips, progress saving while Running, coordinate-file mapping, preserved optics, clearing all picks, completion and rejecting saves after completion. Unsupported mode detection and invalid coordinate tests passed. Browser-selection and gallery regression files also passed, plus syntax checks for server/app/picker/backend. Interactive browser validation and actual relion_image_handler filtering could not be performed in this environment.


## 0.14.1 picker startup

Passed a runtime startup regression with browser API stubs: URL history replacement executes, the picker reaches its API request, and an API error is rendered. JavaScript syntax check also passed. This test does not validate browser rendering.


## 0.14.2 helical picking

Passed pair validation/removal tests, picker startup regression, supported-mode tests and native helical job registration/save/finish with ordered endpoint coordinates. Server and picker syntax checks passed. RELION source confirms sequential endpoint pairing and rejection of odd coordinate counts by helical extraction. Browser interaction remains unverified here.


## 0.14.3 local resolution controls

Passed tests for the -1 default override, merged tab field coverage, both method-selection directions and existing auto-picking controls. App syntax check passed. Interactive browser verification remains pending.


## 0.14.4 Import controls

Passed merged-tab coverage, mutual exclusivity in both directions, field visibility with either/both modes disabled, retained field values, and the existing auto-picking/local-resolution control tests. App syntax check passed. Interactive browser verification remains pending.


## 0.14.5 Import and error guidance

Passed Import mutual-exclusion/visibility tests including enabling the opposite mode when switching to No. Error formatter tests verify I/O and reference-tab annotations and leave unrelated errors/nonempty fields unchanged. Server and app syntax checks passed. Browser interaction remains unverified here.


## 0.14.6 Import radio controls

App syntax check and Import mode/visibility regression passed. Reviewed shared native radio grouping, retained field IDs, accessible labels and help buttons. Browser layout verification remains pending.


## 0.14.7 pinned Import row

Reviewed sticky positioning against the parameter panel's desktop and narrow-layout padding and overflow rules. CSS-only change; interactive browser verification remains pending.


## 0.14.8 parameter sizing

Reviewed flex sizing, responsive minimum height and grid surplus allocation against existing editor/inspector rules. CSS-only change; interactive resize verification remains pending.


## 0.14.9 idealized pipeline sizing

Reviewed row placement, size containment and flex scrolling: only the inspector contributes content size to the shared desktop row; the ideal panel stretches to that row and its steps can shrink/scroll. Narrow layouts receive an independent viewport limit. CSS-only change; interactive resize verification remains pending.


## 0.14.10 CTF power spectra

Passed producer-rule tests covering disabled/enabled power-spectrum output, aliases, absolute paths, unknown inputs and non-Motion correction producers. Server and app syntax checks passed. Interactive browser verification remains pending.


## 0.14.11 auto-picking choice

All four auto-picking control tests passed, including last-active-method protection for all three methods and exclusive LoG defaults. App syntax check passed.


## 0.14.12 Topaz controls

Five tests passed covering existing auto-picking constraints, moved fields, conditional visibility, complementary Topaz modes, all three method-tab combinations and retained dependent-field rules. App syntax check passed. Browser verification remains pending.

## 0.14.13

Auto-picking method and Topaz mode radio groups added; autopicking/Helix tabs gated on References. Five focused Auto-picking tests pass; app.js syntax checked. Browser interaction was not verified in this environment.

## 0.14.14

Manual picking lowpass/highpass/angpix now use the existing conditional-field mechanism with do_topaz_denoise=No. Verified both toggle states against the layout conditions. Browser interaction not tested.

## 0.14.15

Startup creation/decline/existing-directory/file tests and summary parser tests pass. Server and app syntax checked. Browser layout not verified. Missing logs or unrecognized results produce empty summaries.

## 0.14.16

Fixed POST /api/refresh bypassing summary enrichment. Verified both state routes invoke enrichment; startup and summary tests pass, server syntax checked.

## 0.14.17

Iteration-link tests pass for padded filenames, preserved log text, and job/status/log-kind restrictions. App syntax checked. Browser interaction not tested.

## 0.14.18

Fixed missing iteration-links.js static route. Regression check verifies all relative browser module imports are in the server allowlist and exist. Import and iteration tests pass; server syntax checked.

## 0.14.19

Queue defaults/legacy migration/per-job precedence and browser import tests pass. Server and app syntax checked. Desktop equal panel layout not browser-verified.

## 0.14.20

Editor selected-job label uses the current pipeline job on every editor render and is hidden when there is no selected job. App syntax checked.

## 0.14.21

Maintenance tests verify cached measurements, completion invalidation, successful/protected job filtering, and Trash symlink safety. Browser import tests and JS syntax checks pass. Native cleanup delegates to existing adapter operations.

## 0.14.22

Regression test verifies cleanup-only folders appear alongside deleted groups, empty directories are omitted, and repeated listings remain consistent. App syntax checked.

## 0.14.23

BILD parser tests cover numeric colors, coordinates, radii, invalid data and companion filenames. Source format checked against RELION healpix_sampling.cpp. Browser-import and syntax checks pass. Interactive NGL rendering not verified in a browser.

## 0.14.24

Batching test verifies no dropped cylinders and shared visibility. Parser/import tests and viewer syntax pass. Actual GPU rendering not tested here.

## 0.14.25

GPU persistence/precedence and available-space parsing/cache tests pass, along with existing maintenance checks. App and size-module syntax checked.

## 0.14.26

Regression test covers externally moved Trash files, missing files after emptying, and normal image paths.

## 0.14.27

Removed overflow:visible from the Binarisation form; contained viewport in its existing scrolling form. CSS sizing reviewed; live browser resizing not verified.

## 0.14.28

DynaMight template unfolding and idempotence tested; native adapter compiled against RELION. Native integration tests cover preview, independently numbered scheduled continuation jobs, absolute links, re-capture, and stock scheduler execution of all three phases using a mock DynaMight executable. Existing refine3d/class3d clone scheduler regression tests pass. Initial mock tests run with fixtures inside the ESM package failed because extensionless CommonJS fixtures inherited type=module; rerunning those existing tests with TMPDIR outside the package passed. No real GPU computation was run.

## 0.14.29

Added regression coverage for capturing a concrete DynaMight job with a self-checkpoint and no fn_cont field. DynaMight validation/capture tests pass.

## 0.14.30

Regression test uses the reported jobN+33 checkpoint with a leading slash in its suffix, verifies three-phase expansion, downstream rewriting and idempotence. DynaMight and mask-template tests pass (native tests omitted for this JS-only normalization).

## 0.14.31

Batch-preview regression exercises a native-style LoG/GPU error with global override and checks step/job/field context. Seven JS tests pass; three optional native tests skipped for this error-reporting change.

## 0.14.32

Batch-preview tests verify explicit use_gpu=No, do_queue=No and empty gpu_ids override global values while an omitted queue name inherits its default. Inherited GPU conflict reporting also passes.

## 0.14.33

Resource-policy tests cover all requested job/method branches, GPU-ID count validation, CPU divisibility, old-template normalization, removal of machine-path bindings, capture and preview, and resolved values reaching batch scheduling. Project-default, batch-error, mask/DynaMight template, syntax and browser-import checks pass. Native GPU computations and browser dialog interaction were not tested for this update.

## 0.14.34

Eight focused tests pass: executable existence/permissions, relative paths, empty values, failed-save preservation, pooling validation, empty GPU selection, template resource resolution and precedence. App syntax checked.

## 0.14.35

Pending output branch renders text-only elements without links, buttons or event handlers. All output types pass through the same gate. Status transitions rebuild inspector nodes. App syntax checked; browser interaction not verified.

## 0.14.36

Manual-reminder tests cover symbolic renumbering, JSON round-trip, explicit removal, invalid fields, persistence across reads, filesystem availability, and resolved preview warnings. Resource/import checks pass, including Local resolution and ModelAngelo rules. JavaScript syntax checked. Native computations and browser interactions not tested for this update.

## 0.14.37

Six manual-requirement tests pass, covering capture, migration, retained dependencies, custom instructions, non-training producers, manual-map reminders, persistence and batch preview. The supplied idealized pipeline was also validated: jobN+10 has no automatic reminder and jobN+18 retains its fn_ref reminder.

## 0.14.38

JavaScript syntax checks and three map/link/API tests pass, including authenticated CIF downloads and rejection without a token. Browser WebGL rendering has not been visually verified in this environment.

## 0.14.39

Two tests exercise the bundled NGL CIF parser with and without chem_comp metadata, verifying atom count, residue count and coordinates. Both pass. No user CIF was supplied; GPU rendering was not tested.

## 0.14.40

Eight computing-resource tests pass, covering legacy GPU migration, empty IDs, requested defaults, executable validation and template scheduling resource rules. app.js syntax checked.

## 0.14.41

Syntax checks and six API/default tests pass, including existing, missing and wildcard input paths. Browser layout has not been visually tested.

## 0.14.42

app.js syntax check passed. Inspected Close-button CSS specificity and empty-value restore handling. Browser layout has not been visually tested.

## 0.14.43

app.js syntax check and five defaults tests pass. Queue-template tests cover non-executable readable files, missing files, directories, disabled queue submission, and preservation of saved settings on failure. Browser rendering has not been visually verified.

## 0.14.44

JavaScript syntax checks and Import wildcard-count test pass, covering multiple matches, alternatives, zero matches, directory exclusion and external-root rejection. No browser visual verification.

## 0.14.45

ideal-pipeline.js syntax check passed. Review groups reports by step ID and auto-expands manual requirements; browser appearance not visually verified.

## 0.14.46

app.js syntax check passed. Highlighting is scoped to scheduled jobs, missing requirements and matching field values, and updates on editor changes and state refreshes. Browser rendering not visually verified.

## 0.14.47

app.js syntax check passed. Reviewed bounded flex layout, per-section scroll restoration after rendering all sections, and descendant-based keyboard row selection. Browser layout not visually verified.

## 0.14.48

Gallery tests pass including central slices for odd/even volume depths and unchanged indexed stack reads. Native browser-selection regression passes for job registration, saving class/particle subsets and success marking. Browser appearance not visually verified.

## 0.14.49

Five gallery tests pass, including non-cubic X/Y/Z slice dimensions and voxel ordering, odd/even depth and existing 2D stack behavior. JavaScript syntax checked. No browser visual verification.

## 0.14.50

Three tests pass: supported-mode routing, native coordinate saving/finishing and mock Topaz arguments/output/cleanup. Actual GPU Topaz inference and browser appearance were not tested.

## 0.14.51

Four picker tests pass, including native save/finish, Topaz mock, and progress counts for particles/filaments. JS syntax checks pass. Browser layout not visually verified.

## 0.14.52

Import matching and frame-line-count tests pass; app.js syntax checked. Real image-handler execution and browser appearance not verified here.

## 0.14.53

app.js syntax and both Import count/frame tests pass. Reviewed changed-value guard and stale-response protection. Browser interaction not visually verified.

## 0.14.54

app.js syntax check passed; reviewed disabled-field synchronization and raw-pattern change invalidation. Browser interaction not visually verified.

## 0.14.55

app.js syntax check passed. Visibility uses the existing field synchronization invoked on parameter changes and editor rendering. No browser visual verification.

## 0.14.56

app.js syntax check passed and the Motion correction input field key was checked against layout metadata. Browser layout not visually verified.

## 0.14.57

app.js syntax check passed. Reviewed inline hint persistence across editor redraws and case-insensitive reciprocal naming conditions. Browser layout not visually verified.

## 0.14.58

PDF viewer JavaScript syntax check passed. Reviewed successful-load status removal and error visibility. Browser-specific PDF zoom not visually verified.

## 0.14.59

Rebuilt native adapter and passed all five picker tests. New native regression covers Auto-picking manual continuation, loading old coordinates, editing one micrograph, retaining another mapping and marking success. JavaScript syntax checks pass. Browser layout not visually verified.

## 0.14.60

JavaScript syntax checks pass. Reviewed UI normalization and server guard against current/saved Topaz-training settings. Browser interaction not visually verified.

## 0.14.62

Parsed all 26 supplied model files (iterations 0–25), four classes each, without warnings; verified iteration 5 class 2 population 0.929143. Two tests pass for named columns, stable class IDs, continuation names, partial files and refresh recovery. JavaScript syntax checked. Browser rendering not visually verified.

## 0.14.63

HTTP regression confirms /convergence.js returns 200, text/javascript and the expected exported function. Both API tests pass.

### 0.14.64
Convergence parser/cache tests and map endpoint/static module regressions: 6 passing tests. Checked attached 2D model STAR files. JavaScript syntax checks passed.

### 0.14.65

Targeted suite: 14 passing tests, 2 pre-existing fixture-dependent reschedule
tests skipped. Included real native External-job launch/completion and output
registration, authenticated HTTP preview/run/gallery/image/save/download flow,
script execution on tiny fixture files with quoted paths, no overwrite,
missing/ambiguous data matches, duplicate basenames, read-root and symlink
rejection, cross-page Shift selection, linked scrolling, and existing
convergence/static-module/map regressions. JavaScript syntax checks passed.
Optional `test/screening-browser.mjs` covers the browser workflow, but Chromium
failed to launch in this environment; a full visual/browser run is not claimed.

### 0.14.66

Screening/static-module suite: 8 tests passed, including native and HTTP
integration. Added regression for excluding missing full-size previews,
removing stale draft selections, retaining original image indices and the
all-excluded case. Client module syntax check passed. Compact layout has not
been visually browser-tested in this environment.

### 0.14.67

10 targeted tests passed: secure/insecure-context request IDs, static module
routes, screening unit tests and native/HTTP integration. A non-Data FoilHole
overview fixture is excluded before copying. Browser module syntax checks
passed. No full visual browser run was performed.

### 0.14.68
Screening caption removal: client JavaScript syntax checked. No full browser visual run performed.

### 0.14.69

Nine targeted tests passed, including native RELION output registration and
HTTP workflow, mocked image-handler single/multiple-frame detection, exact
selected-file copying, existing-folder refusal, and abort cleanup. Actual
cryo-EM file frame detection and full browser visuals were not exercised here.

### 0.14.70

30 targeted tests passed: independent Pillow-generated raw/LZW/Deflate/PackBits
fixtures (8-bit, uint16, float32), exact samples and vertical row order, statistics,
big-endian TIFF, hand-built BigTIFF and tiles/strips with horizontal prediction,
truncation/unsupported predictor rejection, recursive gain collection, naming
collisions, byte-exact MRC copy and identical-output reuse, nonstandard gain
extensions, plus native/HTTP screening and static-route regressions. Native
integration verified that the gain MRC is registered before successful
completion. Production microscope gain files were not supplied; conversion
has not been compared against a running IMOD binary.

### 0.14.71

Input chooser tests: 4 passed; 2 native-adapter-dependent tests skipped.
New regression checks arbitrary STAR selection, exclusion of other extensions,
project confinement and rejection for unrelated job types/fields.
Server and frontend JavaScript syntax checks passed.

### 0.14.72

12 targeted tests passed; 2 existing native-fixture input tests skipped.
Native screening integration now covers Continue on the same job number,
new file discovery, previous selection restoration, stale-revision rejection,
unchanged destination preservation, one new copy plus one reuse, and a newly
discovered gain file. Server and client syntax checks passed. No full browser
visual test was performed.


## 0.14.73
Nine screening tests passed, including native External job continuation and authenticated HTTP workflow. Added regression coverage for unchanged preview reuse (preserved mtime), cached frame detection, changed preview refresh and frame-cache invalidation on changed full-size input. Real acquisition storage performance was not benchmarked.


## 0.14.74
15 screening/frame-header tests passed, including native continuation and HTTP workflow, metadata-only reuse despite inode changes, changed destination rejection, real TIFF frame counting without the statistics executable, and classic/BigTIFF in both byte orders with cycle rejection. No benchmark on the user's network storage was possible.


## 0.14.75
15 screening/frame-header tests passed. Regression coverage changes only the destination timestamp and verifies reuse without touching it, then changes only the source timestamp and verifies rejection. Destination size mismatch remains rejected. Native continuation and HTTP workflow also pass.


## 0.14.76
16 screening/frame-header tests passed. Added a continuation test with a manually copied second file and deliberately different destination date: both files are reused, no files copied, destination date preserved, source snapshot recorded, next reuse succeeds, and subsequent source modification is rejected.


## 0.14.77
Gain conversion and screening tests passed, including all eight orientation tags for classic TIFF and BigTIFF, invalid orientation rejection, and end-to-end conversion of a non-default-orientation EER_GainReference.gain fixture. Pixel samples retain the established IMOD row order. The user's actual gain file was not supplied and was not tested.


## 0.14.79
10 targeted workstation-default, template-resource and auto-picking tests passed. Covered CPU/GPU process/thread derivation, scientific parameter preservation, LoG GPU forcing, and switching references to either global GPU preference. Frontend/server syntax checked. No interactive browser validation performed.


## 0.14.80
Rebuilt the native adapter against the available official source objects. Six picker tests passed, covering nested native-style output names/mapping, native save/finish accounting, legacy coordinate reads, autopick continuation, five-column output and helical psi. Compared columns with both user attachments. Browser visuals were not tested.


## 0.14.81
Layout-only picker HTML/CSS change. Existing element IDs and picker event bindings retained. HTML nesting and IDs checked with Python HTMLParser. No live browser rendering verified in this environment.


## 0.14.82
Four targeted classification/workstation tests passed, covering CTF hiding/enabling, exclusive method normalization, dependent-field visibility, gradient MPI=1, and EM project-derived MPI. Frontend/server syntax checks passed. No live browser rendering verified.


## 0.14.83
Four targeted tests passed: classification controls, gradient resource resolution and Import patterns for old/new screening reports with lowercase/uppercase TIFF extensions. Frontend syntax checked.


## 0.14.84
13 screening tests passed, including native continuation and HTTP workflow. Added deselection deletion and empty-selection coverage; verified remote sources and unrelated destination files survive, and deleted entries leave the copy ledger. Browser JS syntax checked.


## 0.14.85
14 screening tests passed. New regression recreates an untracked, manually copied deselected file with a different timestamp: it is deleted and counted, while selected copies, source files and unrelated output files survive. A mismatched-size manual file is rejected and preserved.

## 0.14.86
Frontend JavaScript syntax checked. Reviewed pending hint, response/error replacement and rebuilt-input handling. No live browser timing test performed.

## 0.14.87
Seven picker tests passed, including defocus metadata parsing, native picking and autopicking continuation. Frontend syntax checked; no browser visual validation performed.

## 0.14.88
Picker JavaScript syntax checked. Reviewed success/error cleanup, timer lifecycle, quiet intermediate save status and duplicate-click guard. No live browser timing test performed.

## 0.14.89
Native adapter rebuilt; seven picker tests passed, covering native save/finish, mapping preservation, autopicking continuation and progress totals. Server syntax checked. No large remote-filesystem benchmark performed.

## 0.14.90

Particle statistics and browser-picker tests: 10 passed, including native-adapter integration. Checked synthetic constant and varying pixels, disk boundaries, non-finite pixels, cache reuse/invalidation, filtering, persistent backup discovery, undo, later-edit conflicts, stale statistics rejection and native coordinate mapping preservation. Server, picker and particle-quality JavaScript syntax checks passed. Browser visual testing was not performed in this environment.

## 0.14.91

Particle statistics tests: 3 passed, including native filtering/undo integration and diameter cache invalidation. JavaScript syntax checks passed for picker.js and particle-quality.js. Reviewed current-micrograph request scope, diameter invalidation and batch-removal gating. No browser visual test performed.

## 0.14.92

Checked whole-image statistics and cache reuse against exhaustive binary16 fixtures in both byte orders: finite counts, excluded non-finite counts, extrema and zero mean within numerical tolerance. Server and picker syntax checks passed. No browser visual test performed.

## 0.14.93

Four statistics tests passed, including native filtering/undo integration, automatic power cutoff, equal-power strict comparison, invalid exclusion and power-only measurement. Picker JavaScript syntax checks passed. No browser visual test performed.

## 0.14.95

Four statistics tests passed, including concurrent worker results, non-default multiplier, invalid multiplier rejection, native deletion/undo integration and cache behavior. Server, picker and statistics module syntax checked. Browser visual testing not performed.

## 0.14.96

Five tests passed: class particle counting excludes optics rows, rounding and source refresh, worker statistics and native filtering/undo. Server and gallery syntax checks passed. No browser visual test performed.

## 0.14.97

App JavaScript syntax check passed. Reviewed startup order, missing selection fallback, continuation-field clearing, saved-job value precedence and project-scoped persistence. Browser visual testing not performed.

## 0.14.98

Dependency test passed for grouped files, alias resolution, branches, cycles and failed-job status. App, connection module and server syntax checks passed. Attempted browser layout check, but Chromium could not launch in this environment; no visual browser validation claimed.

## 0.14.99

Reviewed user screenshot and simplified routing to disjoint vertical lanes. Dependency test and module syntax check passed. Browser visual validation remains unavailable.

## 0.14.100

Connection test and app/module syntax checks passed. Reviewed horizontal-scroll save/restore and compact gutter sizing. Browser visual testing unavailable.

## 0.14.101

Dependency test and app/module syntax checks passed. Reviewed single-selection gating and direct-neighbor highlighting. Browser visual testing unavailable.

## 0.14.102

App and server syntax checks passed. Reviewed initialized/uninitialized gating, persisted defaults revision, save unlock, read-only/demo exemptions, tab ARIA relationships and keyboard switching. Browser layout verification unavailable.

## 0.14.105

Three job-info tests passed, including scaled/unscaled extraction summaries, last matching count and missing completion message.
