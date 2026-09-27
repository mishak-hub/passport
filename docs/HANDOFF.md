# Repository handoff

This folder is a prepared source tree, not an initialized Git repository. No GitHub remote, commits, tags or release have been created.

## Included

- Current 0.3.2 extension source and matching data/source notices.
- Existing test suite and clearly scripted playground fixture.
- Historical benchmark inputs, results and analysis; rerunning live benchmark scripts can incur provider charges.
- New README, 12-version changelog, design report, architecture, commit plan and filming plan.
- Portable package configuration and Python release builder.

## Checks performed on this copy

- 116 tests passed using the available Node runtime and installed jsdom dependency.
- Firefox extension lint: zero errors, warnings or notices. Its separate update checker could not access its config; lint itself succeeded.
- The new packaging helper ran successfully. Every packaged runtime file matched the saved 0.3.2 XPI contents. ZIP hashes differ when archive ordering/timestamps differ.
- Documentation links checked; no broken local Markdown links found.
- No detected real-key patterns in text/code files. No individual file exceeded 50 MB in the prepared tree.

An npm install from a fresh network environment was not performed. Run npm install and commit its generated lockfile before CI. The handoff ZIP excludes dist, node_modules and .git.

## Still needed

Choose the original-code license, review the staged diff and third-party notices, complete the live validation checklist, and add the filmed demonstration. Do not claim the video exists or live Zen verification has passed before recording/testing it.

The requested Word template could not be rendered because LibreOffice was missing. The template workflow requires “Render and verify the finished document.” Its structure is supplied as DESIGN-REPORT.md; no unverified DOCX is included.
