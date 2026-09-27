# Passport demo clips

[Combined demo](passport-demo.mp4): approximately 67 seconds, 1920×1080, 30 fps, silent, 1.5× playback. Original recordings remain untouched outside this repository. Only edited excerpts are included here.

## Clip guide / text description

| Combined time | Clip | What to watch |
|---|---|---|
| 00:00–00:49 | [Photography email](photography-email.mp4) | A Gmail draft is edited in place. Passport's compact companion supplies word choices while the message evolves into Spanish. Intermediate substitutions are provisional, and the recording includes imperfect wording. |
| 00:49–01:02 | [Web search](web-search.mp4) | The user types a Japanese gardening search from English inside DuckDuckGo's webpage input. The companion shows choices near/below the active typing area. |
| 01:02–01:07 | [One Piece](one-piece.mp4) | The user types a community query containing One Piece; the Japanese title ワンピース appears in the query. |

These are typing-focused excerpts: they omit setup, long pauses, result-page browsing and the unsuccessful French practice recording. There is no voiceover to transcribe. Timing is rounded; [edit-manifest.json](edit-manifest.json) records exact source intervals and playback speed. No generated UI or simulated keystrokes were inserted into the recordings.

## What the mechanism adds

1. A content script tracks the focused webpage field and the current word/sentence.
2. Bundled dictionaries provide local candidates. Tab cycles them; Space adopts the current candidate. Approximate spelling can be wrong, particularly in practice mode.
3. Optional Jev processing ranks supplied candidates with sentence context. The screen recording alone cannot confirm its participation in any particular selection.
4. Gemini or local Ollama can reconstruct a sentence after an eligible 500 ms pause or sentence-ending punctuation. Provider time is additional. The source sentence is retained so reconstruction does not rely solely on earlier automatic guesses.
5. Version, caret and focus checks reject stale results. Depending on boundaries and protected choices, a result is previewed or applied.
6. Word exploration can show meanings, readings and a speech control. Those controls are visible in the companion, but the typing-only cut is not a complete pronunciation/learning-bubble demonstration.

## Publishing

The repository README links to these real files. GitHub may offer a download instead of an inline video player. For an embedded player, upload the reviewed combined MP4 as a GitHub-supported video attachment and replace the README's video link with the returned URL. No remote upload has been performed.

The known French failure is described in [the diagnosis](../docs/FRENCH-PRACTICE-ISSUE.md). Do not use this edited highlight as a latency benchmark or as evidence that all translations are accurate.
