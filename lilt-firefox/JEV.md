# Live Jev and offline dictionary ranking

Version 0.2.5 includes live candidate ranking. In Settings, enter a TypeSafe key, enable **Allow live ranking through TypeSafe**, and click **Save and test Jev**. This is off by default and separate from the sentence provider. It sends the current word, up to 600 sentence characters, and up to ten candidate meanings/readings to TypeSafe. Using local Ollama does not make Jev local.

Loanwords and native-origin words are equally eligible. Jev considers up to ten candidates, ranks by meaning, context and everyday usage, and only five are displayed. Local fallback ordering is retained until a confident live result arrives.

Candidates appear immediately from the dictionary. After a 220 ms pause, Jev may reorder them using sentence context. Space accepts whichever candidate is current without waiting. Responses arriving after typing, cursor movement, focus change, an explicit selection or Space are discarded. A 2.5-second timeout, 40 requests/minute per background session, confidence gate of 0.8 and 200-entry memory cache limit request overhead. Failures and low confidence retain local ranking. This is model judgment, not a correctness guarantee. No dictionary-wide ongoing background crawl runs.

The TypeSafe key stays in extension storage; no key is bundled. Remove TypeSafe key disables live ranking. Settings changes cancel pending requests and clear the memory cache. Runtime context and decisions are not saved as a conversation log or global dictionary update. Word suggestions in pp searches support the same service, with revision checks before display.

The previous offline build-time workflow remains below.

Passport supports offline Jev candidate review through TypeSafe's Choice API. Version 0.2.3 ships 38 approved rankings from 56 live evaluations using jev-1.13.0. The batch sampled all 20 language directions; this is not a completed dictionary audit or a measured accuracy improvement. Review records, including rejected decisions, are in `dictionary-sources/jev-review.json`. Approval was reviewed by the coding assistant, not an independent linguist.

Changed first candidates: English to Spanish on → en, best → mejor, first → primero, bank → banco; English to Mandarin first → 第一. Other approved rows preserve the existing first candidate. Eighteen decisions were withheld for low confidence, abstention or inadequate meaning/context. Japanese in/で/に remains unresolved without sentence context; the batch did not establish a universal particle mapping. French best exposed missing candidates and was not approved.

With live ranking disabled, the extension performs no Jev requests. No TypeSafe key is bundled. Reviewed offline decisions apply in webpage and omnibox lookup. Existing dictionary filtering runs first. Matching includes candidate text, reading and meaning so changed senses invalidate old decisions. Offline practice lookup is unchanged; live ranking can reorder practice candidates when enabled. Jev does not generate missing words or rearrange Japanese particle placement; sentence reconstruction still handles word order.

## Prepare, evaluate, review, publish

Requires Node 22+ and a separate TypeSafe API key for evaluation. Gemini credentials do not work here. API usage is subject to TypeSafe's terms and account limits. Only explicit dictionary jobs are sent, never browser typing. Do not place keys in files or commands that will be shared.

Create `words.json` containing an explicit list, for example:

```json
[{"source":"en","target":"ja","word":"best"},{"source":"en","target":"es","word":"on"}]
```

From the extension source directory:

```powershell
node dictionary-sources/jev-rank.cjs prepare words.json jobs.json
node dictionary-sources/jev-rank.cjs evaluate jobs.json review.json
```

Set `TYPESAFE_API_KEY` through your local environment before evaluation; optionally set `TYPESAFE_MODEL` to a specific supported model. The default is `jev-latest`. Preparation loads all four bilingual packs and supports every direction between English, Spanish, French, Japanese and Mandarin. It evaluates the existing shortlist (up to ten candidates), not every sense in the source dictionaries. Use batches of at most 100 jobs. Requests run sequentially, stop on error, and checkpoint results after each completed call. Re-running a batch makes new calls; remove completed jobs before retrying.

Inspect the selected candidate and probabilities in `review.json`. Change `approved` to `true` only for decisions you accept. Confidence 0.8 is an initial review gate, not a measured accuracy guarantee. Abstentions and lower-confidence decisions retain current local ordering.

```powershell
node dictionary-sources/jev-rank.cjs publish review.json rankings-data.js
```

Publishing replaces the complete ranking table; combine approved batches first if retaining earlier decisions. Reload the extension and refresh webpages. Repackage after publishing to distribute rankings. The runtime never changes automatic-insertion policy or manufactures a missing translation. Candidate generation, all-dictionary semantic auditing, local usage personalization and revised Space behavior remain separate work.

## Validation

Tests cover request shape, all twenty language directions, mocked authentication/HTTP behavior, malformed responses, abstention, confidence gates, stale candidate senses, practice isolation and all 38 shipped rankings against real packs. Live authentication and 56 responses were verified. Multilingual accuracy, latency and account cost have not been independently measured. No API key is stored in the source or release.

Sources: [TypeSafe quick start](https://docs.typesafe.ai/introduction/quickstart), [Choice](https://docs.typesafe.ai/primitives/choice), [Introduction](https://docs.typesafe.ai/introduction).

## 0.2.6 abstention handling

An explicit Jev `none` answer is distinct from timeout, disabled ranking, rate limiting and low-confidence non-abstaining answers. The companion offers Keep original and Space preserves the native word. Explicit choices and late-response guards still take precedence. The omnibox handles abstention without letting a late ranking overwrite a completed sentence result. No frequent backwards passes are enabled; the 24-phrase pilot is available separately in passport-benchmark.
