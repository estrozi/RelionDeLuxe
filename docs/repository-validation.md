# Repository validation

## Testing branch validation — 2026-11-27

After the read-only Auto-picking inspector and the failure fixes in PR #1, the full `npm test` suite on Linux / Node.js 24.22.3 completed with **608 tests: 573 passed, 0 failed, 35 skipped**. The preceding testing-branch run had 606 tests: 558 passed, 13 failed, 35 skipped. No failures were suppressed, tests removed, or new skips added. Two regression tests were added.

The focused files covering the original failures completed with **32 tests: 28 passed, 0 failed, 4 skipped**. JavaScript syntax and whitespace checks passed. In this restricted workspace the runs used `TMPDIR=/workspace/scratch/35602d25e0aa/tmp`; a normal workstation can use its standard temporary directory.

### Resolution of the 13 original failures

| # | Failing behavior / test | Resolution |
| --- | --- | --- |
| 1 | Mask-completion refresh | Supply the execution-mode callback and workspace state in the isolated test harness; retain stale-response and editor-refresh assertions. |
| 2 | Connector activation | Initialize the navigation serial in the harness; retain endpoint-toggle and scrolling checks. |
| 3 | SPA HTTP workflow | Validate schema/layout correspondence instead of an obsolete count; use global CPU/GPU settings and same-origin frame policy. This exposed and fixed a real demo Trash error: read Trash entries from the underlying demo adapter, not its wrappers. The full delete/restore flow now passes. |
| 4 | Ideal-pipeline capture | Expect queue settings to become portable `TBD` resources, not external queue-file bindings; inactive scientific inputs remain omitted. |
| 5 | Import extension spelling | Check that actual files override a stale screening report; verify uppercase detection after renaming the actual file. |
| 6 | Picker startup | Strip all module imports in the VM harness and provide the event-listener stub; retain history, API and error-display checks. |
| 7 | Pinned-editor isolation | Supply the reference-greyscale callback in the harness; retain the check that only native-key fields are synchronized. |
| 8 | Pinned entry points | Verify the current About dialog displays the server version, alongside the existing pinned-control placement checks. |
| 9 | Queue defaults | Account for built-in defaults while retaining persistence, legacy thread/MPI exclusion and timestamp precedence checks. |
| 10 | GPU defaults | Account for built-in defaults while retaining global-save and per-job precedence checks. |
| 11 | STA sequential defaults | Verify fresh drafts still receive valid inputs after an earlier failed job. Add a separate browser regression proving existing job editors do not request or apply draft defaults. |
| 12 | STA frame inference | Fix a real application bug: `undefined !== null` admitted absent `.mdoc` metadata into dose handling. Apply only finite doses, preserve explicit edits, and test absent, empty, null, invalid, zero and valid metadata. |
| 13 | STA HTTP startup | Validate schema/layout correspondence instead of an obsolete count; additionally verify empty demo Trash through the wrapper stack. |

The 35 skips remain environment-dependent; native bridge integration and optional browser tests require their dependencies. This result does not validate scientific calculations, cluster execution or interactive acceptance with real data. Node.js 22 is checked separately by repository CI. The published v0.15.320 archive retains its historical validation results below; this branch does not replace that release.

## Historical publication check — 2026-11-26

On Linux with Node.js 24.22.3, `npm test` completed with **601 tests: 553 passed, 13 failed, 35 skipped**. No failures were suppressed. The CI workflow runs the full suite on Node.js 22, the supported minimum; its results may differ from this local check.

This source is published as a **prerelease with known test failures**, not a fully validated stable release. Native RELION bridge integration, scientific calculations, cluster execution and interactive browser acceptance were not validated in this environment. Tests requiring unavailable native or browser dependencies may be skipped.

Failures recorded in that historical run:

- Mask completion refreshes the editor and stale responses cannot restore Running
- connector toggles endpoints and scrolls in the unified list
- HTTP: authenticated local API, origin guard, validation and duplicate submission protection
- Capture omits inactive Import/queue paths, retaining shared paths needed by active jobs
- Import defaults use actual extension spelling, including older screening reports
- Picker initializes browser history and reaches the API without lexical collisions
- regular editor synchronization never handles pinned fields without a native key
- pinned conversion is above template steps; job actions exposes creation
- queue defaults persist; legacy thread/MPI defaults never override job settings
- GPU defaults follow global-save and per-job precedence
- STA compatible defaults reach non-adjacent job types and stop for existing jobs
- browser frame inference maps single frames to corrected STA images and caches unchanged inputs
- STA HTTP startup, assets and demo configuration

Several failures involve isolated browser test harnesses or changed expectations; this publication check does not establish that all failures are test-only defects. Application behavior needs investigation before declaring a stable release.

## Earlier archive preparation

The supplied archive recorded 601 tests: 550 passed, 16 failed, 35 skipped on 2026-11-26. The runtime and environment for that run were not recorded. The current results above supersede that baseline for this publication check without claiming those three differences are code fixes. Application source and test expectations have not been changed during publication preparation.
