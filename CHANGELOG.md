# Passport release history

Reconstructed from 12 saved XPI packages, manifest versions, file differences and retained records. This is artifact history, not an original Git commit log. Dates and commit hashes are omitted because they were not verified. No saved intermediate releases beyond those listed were found.

## 0.1.0 — First prototype under the name Lilt

- Added supported-field companion, all five language choices, globe, fixed/floating placement, practice, enable switch, learning bubbles and Undo.
- Included a small curated lexicon; missing words and detail enrichment could call the hosted model.
- Used a roughly two-second sentence delay and Enter-to-accept before native submission.
- Added source tracking, stale-response guards, local speech, Settings/popup and stored credentials.
- Archived default model string: `gemma-4-26b-a4b-it`. This records configuration, not independently verified model availability.

## 0.1.1 — Persistence and less clutter

- Fixed Settings authentication when options is itself a tab; saved keys/configuration together and verified the stored result.
- Preserved saved keys on blank input and retained entered keys when saving failed.
- Removed timed companion collapse while typing; preserved deliberate dismissal.
- Removed “Connection,” “Learn as you type” and “Your text is safe” copy.
- Changed background.js, content.js, options.js and manifest.json.

## 0.2.0 — Passport and local word lookup

- Renamed the product Passport, retaining the internal ID for settings continuity.
- Added bundled dictionaries, source/license pages and asynchronous indexing; prefixes and spelling candidates no longer required word-level model calls.
- Removed separate word-detail model calls; sentence results supplied learning tokens.
- Added Ollama provider selection, loopback validation, model discovery and testing.
- Reduced delay to one second; eligible complete sentences applied automatically and Enter returned to native send/search.
- Added `pp` omnibox searches, field-aligned floating placement, side and gap controls.

## 0.2.1 — Filter dictionary noise

- Filtered malformed/template surfaces, affix-only/obsolete metadata and Latin-only Japanese outputs.
- Added reviewed alternatives for Spanish articles and Japanese best/first/computer.
- Separated exact spelling from permission to auto-adopt: raw matches and ambiguous words needed selection.
- Updated omnibox policy too. The cautious Space policy was later superseded by requested immediate adoption in 0.2.4.

## 0.2.2 — Offline Jev ranking infrastructure

- Added ranking.js and rankings-data.js to the runtime and applied compatible reviewed records through the lexicon.
- Candidate fingerprints protected against changed meanings/readings.
- **The shipped ranking list was empty.** This added the mechanism, not live results or continuous ranking.

## 0.2.3 — First reviewed ranking data

- Shipped 38 approved rankings from 56 evaluations across 20 directions, according to retained review records.
- Allowed prefix completions alongside unchanged reviewed candidates.
- Examples included English-to-Spanish on → en and English-to-Mandarin first → 第一.
- This was a small assistant-reviewed batch, not a dictionary-wide or independent linguistic audit.

## 0.2.4 — Optional live Jev

- Added live-ranking.js, separate TypeSafe key/consent and connection testing.
- Ranked webpage and omnibox candidates with context, debounce, confidence gate, bounded cache, timeout, rate limit and stale-result guards.
- Space adopted the current provisional candidate without waiting; sentence reconstruction retained responsibility for senses and grammar.
- Improved provider errors, including Ollama origin-blocking 403 versus missing-model failures.
- Local Ollama did not make an enabled Jev service local.

## 0.2.5 — Restore loanword choice

- Restored Japanese loanwords alongside reviewed alternatives without forcing native-origin preference.
- Expanded rankable candidates to ten, displaying at most five.
- Let Jev choose by meaning, context and usage while retaining filters and late-response safeguards.
- Did not establish that every default choice is correct.

## 0.2.6 — Sentence boundaries and phrases

- Reduced idle delay to 0.5 seconds; added immediate punctuation triggers with decimal, abbreviation, URL and email guards.
- Added no-Space previews: Space accepts, ordinary typing dismisses, Enter stays native.
- Separated explicit choices from automatic guesses; rewrites conflicting with explicit choices require checkmark acceptance.
- Added phrase lookup across automatic fragments, including One Piece title candidates and a literal alternative.
- Jev abstention preserved source text; late omnibox rankings could not replace a completed sentence suggestion.
- Did not add repeated retrospective Jev passes or LangExtract. The separate pilot supported retaining full sentence reconstruction rather than limiting Gemini to reordering.

## 0.3.0 — Setup and appearance

- Added first-install-only, resumable setup and a real companion tutorial with optional keys.
- Added appearance.js, preferred light/dark button fills, browser-theme surround, custom accents, brief sheen and gear icon.
- New configurations defaulted to `gemini-3.8-flash`; saved models stayed unchanged.
- **Introduced a regression:** the async Settings theme listener could claim unrelated background replies. Initial tests missed it; 0.3.2 repaired it.

## 0.3.1 — Menu and loading recovery

- Preserved language-menu visibility and native dropdown focus during settings changes.
- Refreshed unchanged suggestions when dictionaries finished loading without adopting late text after Space.
- Added visible dictionary failure/retry instead of silent starter-only fallback.
- Added narrow English helping → help recovery before fuzzy heating/healing matches.
- Restored animated gradient edges, texture and sheen, with reduced-motion support.
- **Did not fix Settings response interception.** Its error label exposed the continuing failure. Menu/loading bugs also reproduced in 0.2.6; not every defect originated in 0.3.0.

## 0.3.2 — Settings message ownership

- Replaced the unconditional async Settings listener with a synchronous notification-only listener so it does not claim dictionary, sentence, configuration or ranking replies.
- Added tests for message ownership, real dictionary delivery with Settings open and sentence replies with a mocked provider.
- Full suite: 116 passing tests. Lint: zero errors/warnings/notices. Live Zen capture timed out, so live verification remained pending.
- Runtime changes from 0.3.1 are limited to options.js and manifest version. Close old Settings/setup tabs and refresh pages to remove the loaded faulty listener.

## Evidence

[release-inventory.json](docs/release-inventory.json) records archive filenames, SHA-256 and added/changed/removed files. XPIs omit historical tests/docs. Current source files should not be presented as if they accompanied every old release.
