# Historical implementation notes

Retained from the development workspace. This file contains superseded release notes and machine-specific observations. The root README and current validation checklist are authoritative.

# Passport 0.3.2 · Firefox / Zen prototype

Passport translates in webpage text fields and teaches vocabulary through candidate meanings, readings and local pronunciation audio. Word lookup stays offline. Optional live Jev ranks candidates through TypeSafe; sentence reconstruction uses the separately selected Gemini or Ollama model.

## Install or update

1. Open `about:debugging#/runtime/this-firefox` in Firefox or Zen (Firefox engine 142+).
2. Choose **Load Temporary Add-on…** and select `passport-firefox-0.3.2.xpi`. Alternatively unzip the source bundle and select `lilt-firefox/manifest.json`.
3. Close old Settings tabs, reopen Passport’s Settings, and refresh webpages that were already open.
4. If you previously loaded this exact unpacked source folder, the existing add-on’s **Reload** button loads these changes.

The extension’s visible name is now Passport. Its internal ID and source folder remain unchanged to preserve existing settings and API-key storage when reloading/updating the same installation. Do not uninstall merely to rename it. The key field intentionally stays blank; the saved-key indicator confirms whether one is stored. A blank save preserves an existing key.

This XPI is unsigned for temporary development installation. Use the temporary-add-on picker, not a normal install/drag-and-drop. Temporary installations must be loaded again after the browser restarts. Public distribution needs Mozilla signing and additional site testing.

## Historical ranking fixes in 0.2.1 (Space behavior superseded in 0.2.4)

The previous importer exposed grammar notation as insertable text and treated exact spelling as permission to auto-commit a raw dictionary sense. Priority ties also followed source order. The runtime index now excludes malformed/template surfaces, affix-only and obsolete metadata. Raw matches never auto-commit. Reviewed choices make English “the” offer el/la/los/las, Japanese “best” start with 最高, and “first” start with 最初. Legitimate everyday katakana remains supported. No per-word LLM calls, usage tracking or telemetry were introduced. Candidate quality still depends on sense/context; do not interpret ranking as a guarantee of correctness.

## Typing

- Focus a supported webpage input, search field, textarea or contenteditable editor. Type two letters to see up to five local candidates before pressing Space.
- **Tab / Shift+Tab** cycles candidates. Meanings appear for incomplete, corrected or ambiguous candidates. Click a candidate to choose and explore it.
- **Space** adopts the current candidate immediately. This is provisional: sentence reconstruction later fixes particles, articles and word order. No candidate means the original word stays unchanged. Late Jev responses never replace an accepted word.
- After **0.5 seconds without typing**, reconstruction begins. Without a trailing boundary, a complete result stays provisional in the companion. Space accepts it; ordinary characters dismiss it and continue the draft. Sentence-ending punctuation starts reconstruction immediately. Decimals, common abbreviations, URLs and email are guarded. At an established boundary, complete results apply automatically only when text, selection, focus and version still match. A pause alone is not proof of completeness.
- **Enter always belongs to the website.** It sends/searches the currently visible text immediately. It cancels outstanding reconstruction; no later response can send or replace that submitted text.
- Use the curved-arrow **Undo** control to recover earlier wording. It may take multiple steps to restore all word replacements. Returning the caret to an accepted sentence reopens its word-by-word learning view.
- Word bubbles use local dictionary information or tokens already returned with the sentence. They never make separate LLM calls. Speaker buttons use installed local system voices.

English, Spanish, French, Japanese and Mandarin are interchangeable. Practice mode accepts approximate target spelling, Japanese romaji and Mandarin pinyin with optional tones. For example, `bonjoor → bonjour`, `eki → 駅` (station), and `nihao → 你好`. These are dictionary candidates, not a full operating-system IME. Auto language detection conservatively leaves ambiguous words unchanged until the sentence model has context.

## Sentence providers

**Gemini API:** choose the cloud provider, save your API key and model, enable cloud processing, then test a sentence. Existing cloud settings remain available. Google’s quotas, availability and data terms apply. There is no Passport backend or database, and no automatic model/provider fallback.

**Ollama:** install/run Ollama and download a multilingual instruction model using its app. Choose Ollama in Passport, keep the endpoint at `http://localhost:11434` (or another loopback port), click **Refresh models**, select an installed model, save, and test. No Google key or cloud consent is required for this route. Model quality and speed depend on the chosen model and hardware. Passport will not install models for you.

For fully local operation, disable cloud models in Ollama itself with `OLLAMA_NO_CLOUD=1` and restart it. If Ollama rejects the extension origin, add the exact origin shown in Passport Settings to `OLLAMA_ORIGINS` and restart Ollama. The extension only accepts HTTP loopback endpoints, rejects cloud-tagged selections, never forwards the Gemini key to Ollama, and does not follow local-server redirects. See https://docs.ollama.com/faq.

One second is the idle trigger, not a guarantee of model completion. The test button reports the measured sentence round trip. Dictionary suggestions continue working without a model connection. Cloud timeout is 25 seconds; local timeout is 60 seconds.

## Ctrl+T / address bar

Open a new tab, type **pp**, press **Space**, then enter your search. Firefox’s native suggestion rows show dictionary translations and, if you pause at a boundary and wait, sentence reconstruction. Enter immediately uses the default search engine with the current suggestion/query. Standard foreground/background tab dispositions are supported.

WebExtensions cannot draw a companion over Firefox or Zen’s native address bar. Passport uses Firefox’s supported omnibox keyword integration and leaves your existing new-tab page unchanged. Reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/omnibox.

## Placement

Use the placement icon to switch fixed/floating. Settings adds **Auto / Above / Below** and a **0–40 px gap**. Floating aligns with the focused field’s left edge and width, subject to viewport bounds and a 280px minimum for controls. Narrow fields use compact controls and a scrolling candidate row. Fixed placement remains at the page bottom. Sticky website controls can still overlap fixed mode; select floating in that case.

## Dictionaries, speed and coverage

Four bundled packs contain **361,132 bilingual rows** across all five languages. Packs are loaded when needed, and indexing yields in small batches during first use. Common starter words work while larger packs load. There is no runtime dictionary service, separate account, word-translation bill, or remote autocorrect API.

The real-pack benchmark measured **0.193 ms median / 0.297 ms p95** across 1,600 warm lookups on this machine. This measures the dictionary engine in Node.js, not full browser input latency. First load and indexing are slower and depend on the browser/device. Timing details are in `tests/performance-results.json`.

These are finite context-free dictionaries. They do not cover every inflection, slang term, typo or phonetic approximation. Non-English pairs may bridge through English and mix senses; review alternatives. Pronunciation coverage is uneven, especially Spanish, and English definitions may appear as a labeled fallback when a native-language gloss is unavailable. Model sentence explanations may also be wrong. Character components are provided with sentence results rather than fetched separately for each word.

Sources: FreeDict / WikDict, JMdict (Jim Breen and EDRDG), and CC-CEDICT via MDBG. Full attribution and license links are available from Settings → **Dictionary sources, licenses & coverage**. Original sources and rebuild scripts are included in the source bundle under `dictionary-sources/`. The code does not embed any real API key.

## Validation and practical limits

See `VALIDATION.md`. Automated checks exercise actual extension scripts, dictionary packs, editor state, settings storage, provider routing and omnibox handlers. Real Firefox/Zen UI automation was blocked by the desktop tool’s browser-policy limitation. This revision therefore still needs hands-on verification in Zen, live Instagram, native address-bar suggestions, and a real local Ollama model.

Rich editors can implement unusual DOM/state behavior; the adapter does not promise every website. Browser chrome, protected pages, closed shadow roots and canvas editors are outside the normal content-script surface. Sensitive fields are filtered, IME composition is respected, and late replies are rejected. Fixed-page spacing cannot reserve space around every sticky site control.

## Live Jev in 0.2.4

Settings → Live word ranking → enter your TypeSafe key → enable the checkbox → Save and test Jev. The key is stored only in local extension storage and is never returned to webpages. This consent is separate from Google sentence processing and is off by default. Up to 600 characters of the current sentence, the source word and up to ten candidates are sent. Jev runs after a 220 ms pause, times out after 2.5 seconds, and is limited to 40 requests per minute per background session. Results are cached in memory (200 entries) and apply only to unchanged, unselected suggestions; low-confidence decisions, failures and limits retain the local order. Changing settings clears the cache and cancels pending requests. New-tab pp suggestions also support live ranking. Models still may choose a wrong sense or lack a suitable candidate.

## Loanwords in 0.2.5

Jev ranks loanwords and native-origin alternatives on equal terms using meaning, context and everyday usage. It receives up to ten filtered candidates; the companion and omnibox display at most five. Reviewed Japanese entries merge dictionary alternatives, including ベスト and ファースト. Malformed-entry filters, confidence checks and stale-response protection remain. No fresh live latency benchmark was run for the larger payload; the 2.5-second timeout and immediate local fallback still apply.

## Sentence previews and phrases in 0.2.6

Space adopts an available word candidate or ready provisional sentence; it never waits for the network. Enter remains native send/search and cancels pending work. A checkmark explicitly accepts a sentence suggestion. If reconstruction changes an explicit Tab/click choice, Space cannot override that choice: review the suggestion and click its checkmark to accept. This conservative check can also request review for an inflected spelling of an explicit choice.

Automatic choices are provisional evidence, not locks. The sentence provider receives the recovered native wording plus separate explicit and automatic choices. Exact dictionary phrases of up to four words are considered across automatic replacements. One Piece has a title candidate, including Japanese ワンピース; English-to-Japanese also offers a literal slice candidate. This is not an exhaustive name catalog. Sentence reconstruction handles broader names and grammatical repair.

When live Jev explicitly chooses none, Space preserves the original current word. A timeout, unavailable service or a low-confidence non-abstaining answer still uses the existing offline fallback. No repeated retrospective Jev pass or LangExtract stage is added.

The pp omnibox also uses the 0.5-second delay and guarded punctuation trigger; it uses the browser’s own suggestion/Enter interaction, not the webpage companion’s Space-acceptance interface. Newer sentence suggestions take precedence over late word rankings.

A no-Space preview never mutates the field, so continuing an unfinished word keeps its native spelling. As before, editing inside an already accepted translated span invalidates its saved mapping; this release does not claim a durable source editor for arbitrary interior rewrites.


## New in 0.3.0: setup and appearance

Fresh installations open a four-step setup: languages, optional connections, colors and hands-on practice. Updates stay quiet. Existing users can open Settings and select Continue setup; Finish later preserves progress and completed setup can be replayed. Existing keys and model choices are preserved. New configurations default to `gemini-3.8-flash` ([Google model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash/)).

Choose Auto, Light or Dark button appearance, with bright and soft accent colors or browser-derived defaults. The companion surround follows the browser theme. Selected candidates have a static glow; buttons show a brief hover/focus sheen and respect reduced motion. Settings now uses a gear icon.

The tutorial uses Passport's real companion and dictionary. Cloud services run only with their separate saved credentials and consent; no keys are needed for offline practice. Sentence translation needs a configured provider. Use Save and test to confirm model access. Setup does not fabricate translation results or automatically test providers.


## Repairs in 0.3.1

The companion keeps its language menu visible and preserves native dropdown focus through settings updates. Local word suggestions refresh after delayed dictionary loading without adopting text. A failed dictionary load now shows a Retry dictionary action instead of silently falling back to starter vocabulary. The supplied button treatment is adapted with animated gradient edges, fine texture and sheen; reduced motion stops animation.

These fixes were reproduced using the actual manifest scripts, background and bundled dictionaries. The reported live sentence-provider warning has not yet been identified from an exact error; this release does not claim to repair account, network or model-access failures. After reloading the extension, refresh already-open webpages.


## Critical messaging repair in 0.3.2

The theme listener added to Settings in 0.3.0 was async, so every open Settings page claimed unrelated request-response messages with an empty Promise. That could win against the background's dictionary, configuration or sentence response. The listener now returns nothing and handles only theme notifications without claiming a reply. Mozilla documents this pitfall at https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage .

Close all old Passport Settings/setup tabs before loading this build, then refresh webpages. Keep keys and existing settings; no reinstall/reset is needed. Workaround for 0.3.0/0.3.1: close Settings/setup tabs and refresh the affected webpage. Regression tests cover the Settings response contract, an actual packaged dictionary response while Settings is open, and sentence response delivery with a mocked provider. Live Zen capture was unavailable during this repair, so that verification is still pending.
