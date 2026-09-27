# Passport design and release report

Prepared from saved packages and current source on September 27 2026. This report explains Passport's behavior, evolution and path to a GitHub release with an honest working demo.

## Executive summary

Passport removes the copy-paste translator loop: write in a webpage, see target vocabulary, then receive sentence correction while retaining word meanings and pronunciation. The current Firefox/Zen prototype combines local dictionaries, optional TypeSafe Jev ranking and Gemini or local Ollama reconstruction.

Version 0.3.2 is the current baseline. Its most important repair prevents an open Settings tab from intercepting dictionary and translation responses. Automated validation passed; a specific live Zen retest is not recorded. Publish as a prototype and complete the live checklist before claiming a stable end-to-end experience.

## Key findings

### Product interaction

The text field and compact companion are the learning surface. Local choices appear while typing and Space adopts them immediately. Reconstruction recovers the original wording so bad automatic guesses can be corrected. Learning bubbles connect words to readings, definitions and sound. This supports exposure during real activity; no learning-outcome study has been performed.

### Release evolution

0.1.0 created Lilt; 0.1.1 repaired persistence and reduced clutter. 0.2.0 renamed it Passport and moved words to local dictionaries, adding Ollama and pp searches. 0.2.1 filtered noisy entries; 0.2.2 added ranking infrastructure; 0.2.3 shipped reviewed decisions; 0.2.4 added live Jev; 0.2.5 restored loanwords. 0.2.6 introduced half-second previews, punctuation triggers, phrases and explicit-choice protection. 0.3.0 added setup/appearance but introduced a messaging defect. 0.3.1 addressed menu/loading symptoms and morphology. 0.3.2 repaired Settings response interception. The changelog documents each archived version.

### Model responsibilities

Jev ranks existing senses; it is not the sentence grammar engine. The historical pilot did not show a benefit from frequent retrospective reranking before Gemini: 50 of 51 intermediate passes became stale under its typing schedule. Gemini needs permission to repair senses, not merely reorder guesses. These findings apply to that experiment, not every future scheduling design or model.

### Reliability lesson

Initial tests called the background directly and omitted competing extension pages. That missed the async Settings listener returning empty replies for unrelated requests. The new tests cover an open Settings page and response ownership. Component checks and actual browser interaction are both necessary before claiming a release is verified.

## Implications

Passport is a local vocabulary layer with optional cloud intelligence. It is not wholly local when Gemini/Jev is enabled, free of provider usage costs, compatible with every field, or a desktop-wide keyboard. Dictionary coverage and multilingual bridging remain limitations. Overlay placement needs real site checks.

The final visual treatment adapts the supplied component in plain CSS: preferred light/dark fill, browser-theme surround, custom accents, animated gradient edges, texture and sheen, with reduced motion. It is not a React migration.

## Recommendations

1. Import the current runtime and matching dictionary sources/notices as a clean Git baseline; preserve historical differences in the changelog.
2. Commit tests and portable tooling; generate a real npm lockfile before CI adoption.
3. Run the live checklist with Settings open, then film at real speed. Do not edit failures into apparent success.
4. Select an original-code license while preserving dictionary terms. Exclude credentials, profiles and private recordings.
5. Add the video, transcript and observed compatibility in a later docs commit. Keep reliability fixes separate from unrelated visual changes.

## Appendix

- [Changelog](../CHANGELOG.md) and [archive inventory](release-inventory.json).
- [Architecture](ARCHITECTURE.md), [commit plan](COMMIT-PLAN.md), [demo plan](DEMO-PLAN.md) and [validation](VALIDATION.md).
- [Historical benchmark](../passport-benchmark/REPORT.md) and [data notices](../THIRD-PARTY-NOTICES.md).

### Format note

The requested Design Report skill guided these sections. Its retained Word template was not modified. Rendering failed because LibreOffice was unavailable, so this is a Markdown report; no visually verified DOCX is claimed.
