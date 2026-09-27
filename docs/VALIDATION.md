# Validation before publication

The retained suite passed 116 tests on the development machine; Firefox lint reported zero errors/warnings/notices. Provider calls are mocked. Live Zen capture failed during the last repair. The user's “we're done” is not a recorded successful browser retest.

## Automated checks

Run `npm test`, `npm run lint` and `npm run package`. Tests cover credentials/configuration, dictionaries, ranking, typing guards, source recovery, setup and Settings message ownership. Packaging checks manifest references and obvious credential patterns. Review the checksum before attaching a release.

## Live checklist

Record browser/version, date and result. Do not prefill passes.

- [ ] Close stale Settings/setup tabs, load 0.3.2 and refresh pages.
- [ ] Keep new Settings open; type homeless and helping. Confirm candidates and no dictionary-unavailable warning.
- [ ] Switch source/target through a focused dropdown; verify the menu and new language work.
- [ ] Test an input, textarea and contenteditable editor; test Instagram separately if claiming support.
- [ ] Test all five target languages and at least one non-English source.
- [ ] Check Tab/Space, no-boundary preview, punctuation, boundary application, Undo and native Enter.
- [ ] Type or move the caret during a pending request; confirm no stale overwrite.
- [ ] Check explicit-choice conflict and checkmark acceptance.
- [ ] Test Gemini access and local Ollama separately if demonstrating both.
- [ ] Test Jev's separate consent and on/off behavior.
- [ ] Check practice, installed voices, light/dark appearance and reduced motion.
- [ ] Check fresh-install setup, update behavior and blank-key persistence.
- [ ] Verify sensitive fields remain excluded without typing real secrets.
- [ ] Capture the main demo without simulated responses or undisclosed time cuts.

## Historical pilot

The retained benchmark used 24 unique phrases, three repetitions and five logical arms with shared calls. Gemini-at-end produced 65/72 assistant-rated usable sentences at 1.99 s median after the final character; frequent Jev plus Gemini also produced 65/72 at 2.12 s. These are controlled historical observations, not current-browser guarantees or general accuracy claims. See the full report for tokenization, scoring and concurrency limits.
