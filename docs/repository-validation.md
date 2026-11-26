# Repository preparation validation

## Publication check — 2026-11-26

On Linux with Node.js 24.22.3, `npm test` completed with **601 tests: 553 passed, 13 failed, 35 skipped**. No failures were suppressed. The CI workflow runs the full suite on Node.js 22, the supported minimum; its results may differ from this local check.

This source is published as a **prerelease with known test failures**, not a fully validated stable release. Native RELION bridge integration, scientific calculations, cluster execution and interactive browser acceptance were not validated in this environment. Tests requiring unavailable native or browser dependencies may be skipped.

Current failing tests:

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
