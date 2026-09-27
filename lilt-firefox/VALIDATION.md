# Passport 0.3.2 validation

Validated September 27, 2026 on Windows with the bundled Node runtime.

## Automated checks

- 112/112 Node tests passed across core, providers/security, real dictionary packs and jsdom interaction regressions.
- New coverage: 500 ms provisional sentence previews; Space acceptance followed by the native input event; continued native typing; immediate terminal punctuation; decimal, abbreviation, URL and email sentence boundaries; explicit selection conflicts; separate automatic/explicit vocabulary in provider requests; phrase merging across automatic spans; Jev abstention preserving native text; late omnibox rankings losing precedence to completed sentence results.
- Existing coverage retains cancellation on typing, caret movement and Enter, IME suppression, native submission, Undo, Settings/key persistence, all 20 language directions and local/cloud provider isolation.
- Runtime lint and package integrity are checked when building the release. Source-only dictionaries and tests are excluded from the XPI.

- Added checks for first-install-only setup, webpage exclusion from setup mutations, deferred/resumed/completed/replayed onboarding, optional keys, color persistence/reset, and model preservation.
- Visually inspected setup and the real offline companion in an in-app browser using a clearly labeled local browser-API fixture. This is not live Firefox extension verification.

## Practical limits

This release was tested with simulated browser DOM events and mocked provider responses. It has not been visually or interactively verified in live Zen/Firefox or logged-in Instagram. No new provider latency measurement was made for this release. The separate 24-phrase benchmark describes the preceding pipeline and its own experimental conditions; it is not a performance certification of 0.3.1.

The older playground's 15 checks and dictionary microbenchmark were not rerun for this release. Do not add those old counts to the current 112 tests. The playground remains a scripted demonstration, not a live model test.

Known boundaries: punctuation detection is heuristic, including conservative handling of a dot immediately after a digit. The no-Space preview is safe to continue typing because it does not alter the field. Editing inside a previously accepted translated span still invalidates that span's original mapping. Phrase lookup covers exact bundled matches of up to four words and a small explicit title case, not all names. Explicit-choice matching is conservative about spelling changes and can ask for review of inflections.

## Repeat

Run `node --test --test-isolation=none tests/*.test.cjs tests/dom/regression.test.cjs` from the extension directory with jsdom available. Lint runtime files with `web-ext lint --ignore-files "tests/**" "dictionary-sources/**" README.md VALIDATION.md JEV.md`.


## 0.3.1 regression investigation

The shipped 0.2.6 and 0.3.0 builds both reproduced menu dismissal while a native shadow dropdown owns focus, delayed dictionary installation without a suggestion refresh, and silent pack failure. Actual manifest-script/background integration now covers these cases plus retry and no late adoption after Space. A real-pack test catches helping being fuzzily matched to heating/healing; a narrow regular English -ing fallback now resolves help before fuzzy neighbors while preserving exact entries and practice mode.

112 automated checks passed. Firefox extension lint: zero errors, warnings and notices (the tool's separate update checker could not access its own config). The revised animation and offline helping suggestions were visually inspected in a local in-app browser fixture. This does not establish live Zen behavior or repair the user's unidentified sentence-provider warning. No live API requests or credentials were used during this investigation.

After the full suite, the three morphology tests passed again including an added test through the actual lexicon/ranking entry point. Fresh visual preview confirms helping now shows help-related Japanese candidates.


## 0.3.2 messaging regression

The Settings theme observer introduced in 0.3.0 was an async onMessage callback. It claimed every unrelated message with a Promise resolving undefined, allowing it to steal responses intended from background.js. The actual options script failed a new regression with: Settings claimed dictionary with an empty Promise, racing the background. The corrected observer returns undefined synchronously and performs only theme-notification work without sending a reply.

All 116 tests pass, including real dictionary delivery with Settings open, unrelated-response ownership, and sentence-response delivery with Settings open (provider mocked). Extension lint reports zero errors, warnings or notices. Live Zen automation failed to capture the window, so actual browser verification remains pending. Closing old Settings/setup tabs and refreshing webpages is the immediate workaround; close them before loading 0.3.2 to remove the old faulty listener. Existing keys and settings are not reset.
