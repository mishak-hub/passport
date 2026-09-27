# How Passport works

Passport is a browser typing companion, not an operating-system keyboard or headless browser. Firefox Manifest V3 background scripts coordinate services; content scripts attach a closed-shadow-root UI to eligible webpage fields. Runtime code is plain JavaScript, HTML and CSS.

## From keystroke to sentence

1. **Find an editor.** editor.js accepts text/search inputs, textareas and supported contenteditable roots. Disabled/read-only controls and sensitive-field identifiers are excluded. These filters cannot guarantee that arbitrary typed content is non-sensitive.
2. **Track source separately.** content.js keeps editor text, caret, revision, translated spans, sentence records and Undo. core.js rebases mappings around edits and recovers native wording.
3. **Load vocabulary.** background.js fetches bundled JSON packs. dictionary.js builds indexes in yielding batches. Starter words work while packs load; completed loading refreshes unchanged suggestions and failures offer retry.
4. **Suggest words.** Bounded prefix/fuzzy lookup, surface filters and narrow English `-ing` recovery generate candidates. lexicon.js adds curated words and phrase matches; ranking.js applies compatible reviewed decisions. Non-English pairs may bridge through English.
5. **Optionally rank.** After 220 ms without typing, live-ranking.js may send the word, up to 600 context characters and ten candidates to TypeSafe. It uses a 0.8 confidence gate, 2.5-second timeout, 40-request/minute session limit and 200-entry memory cache. These are implementation settings, not speed promises.
6. **Adopt on Space.** The current available candidate is provisional. Unknown words remain native. Jev abstention preserves original text; service failures/low confidence retain local ordering. Explicit selections and further edits invalidate pending ranking.
7. **Reconstruct.** A 500 ms pause or guarded ending punctuation triggers Gemini/Ollama. The request contains original wording, visible text, explicit selections and automatic guesses. The model may repair sense, particles, agreement, inflection and order; it must not complete unfinished thoughts.
8. **Validate.** Text, revision, caret, focus and composition state must still match. Incomplete results are not adopted. Complete no-boundary results remain previews; Space accepts. Boundary results can apply automatically. Explicit-choice conflicts require the checkmark.
9. **Learn from the result.** Returning the caret to a recorded sentence exposes learning tokens. Word bubbles show available meaning/reading; speech uses local installed voices. Model character analyses may be unreliable; Ollama results currently strip those analyses.

## Module map

| File | Responsibility |
|---|---|
| manifest.json | Permissions, entry points, options and `pp` keyword |
| content.js | Companion, events, candidate/sentence flow and stale-response guards |
| editor.js | Read/replace supported editors and reject unsuitable fields |
| core.js | Configuration, ranges, source recovery, prompts and response handling |
| dictionary.js / data/ | Local indexes, filters, spelling candidates and vocabulary |
| lexicon.js | Curated words, practice, phrases and ranking entry point |
| ranking.js / rankings-data.js | Reviewed offline ordering |
| live-ranking.js | TypeSafe requests, confidence, caching and cancellation |
| background.js | Credentials, settings, dictionary delivery and providers |
| omnibox.js | Address-bar suggestions and search submission |
| options.js / setup.js | Settings, tests and onboarding |
| appearance.js / ui.css | Colors, animation and reduced motion |

## Data boundaries

| Data | Local use | External processing |
|---|---|---|
| Dictionary rows | Packaged vocabulary and indexes | Candidate data may go to enabled Jev |
| Word/context | Editor state and transient cache | TypeSafe only when enabled/configured |
| Sentence/original wording | Mappings and transient cache | Google with consent/configuration, or selected loopback Ollama server |
| Credentials | Extension local storage | Authentication to the corresponding service |
| Learning history | Transient records and Undo | No built-in analytics/shared progress database |

Keys are not bundled or returned to webpages in configuration. Extension storage is not an encrypted vault. Broad web permissions support cross-site fields; Passport does not automatically translate every page's contents. Filtering cannot infer every kind of private information inside a normal text field.

## Settings regression

Firefox runtime messages reach extension pages as well as the background. The 0.3.0 Settings observer returned an empty Promise even for unrelated messages. It could claim the response before dictionary/model replies. The 0.3.2 observer returns nothing synchronously and processes only theme notifications. Tests now include Settings open alongside a webpage. See [Mozilla's listener documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage).

## Boundaries

Chrome requires separate manifest/runtime testing. A desktop-wide version needs native input/accessibility integration; a headless browser cannot insert this companion into arbitrary desktop fields. LangExtract, repeated retrospective Jev rewriting, account sync and progress analytics are not implemented.
