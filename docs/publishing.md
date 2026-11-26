# Publishing releases

Public repository: https://github.com/estrozi/RelionDeLuxe

The repository runs the full test suite on pushes and pull requests. Known failures remain visible in CI; do not describe a release as fully validated while those failures remain. Native integration and scientific acceptance require separate workstation testing.

For each new release:

1. Review application changes, run `npm test`, and update `docs/repository-validation.md` with the runtime, totals and limitations.
2. Update `package.json`, the changelog and `docs/releases/<version>.md`.
3. Commit the reviewed source and push to `main`.

A push to main that changes `package.json` or `docs/releases/` triggers the Release workflow. It verifies the version and release-note file, packages exactly the committed files into a ZIP, computes a SHA-256 checksum, and creates the matching `v<version>` tag and GitHub **prerelease** at that commit. The workflow can also be run manually from Actions. Existing releases are not overwritten; use a new version for a new distribution.

This known-failure baseline is deliberately not labelled stable. Tests run separately and their status remains visible. Promoting future versions to stable requires resolving failures and reviewing native/scientific validation. If publication fails, inspect the workflow error before retrying; partial releases may need manual review.

Preserve LICENSE and NOTICE. Keep project data, compiled adapters, RELION source checkouts and temporary test directories out of Git. Never force-push over existing work or move a published release tag.
