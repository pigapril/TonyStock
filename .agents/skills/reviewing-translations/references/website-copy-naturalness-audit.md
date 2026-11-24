# Website Copy Naturalness Audit Rubric

Use this rubric with the `website-copy-naturalness-audit` capability in
`SKILL.md`. It is a contextual editorial rubric, not a checklist of words that
proves AI authorship.

## 1. What to detect

### Mechanical or templated construction

- Several adjacent sections use the same opening formula, sentence length,
  three-part sequence, heading cadence, or conclusion pattern without a reader
  benefit.
- Multiple FAQs repeat the same answer frame while only swapping the indicator
  name.
- Every page explains the product with nearly identical generic claims instead
  of explaining the page's own metric, data, use case, or limitation.
- Transitions announce obvious structure (for example, repeated equivalents of
  "next, let's look at" or "in summary") rather than advancing the explanation.
- A page repeatedly restates its title, section heading, or preceding sentence.

### Generic or low-information marketing prose

- The copy promises insight, empowerment, comprehensive analysis, better
  decisions, or a clearer view without identifying the actual data, method,
  output, or user task.
- An adjective (advanced, powerful, intelligent, comprehensive, professional,
  precise) substitutes for evidence or a concrete description.
- A CTA or subheading could be pasted onto an unrelated finance, SaaS, or
  analytics product without changing any noun.
- The copy announces benefits that the product surface does not demonstrate.

### Translation and locale friction

- Grammatically valid wording follows source-language syntax or collocations
  that local writers would not normally choose.
- Noun-heavy or abstract phrasing obscures who does what, what is measured, or
  what action the user can take.
- Terminology is understandable but regionally wrong, inconsistently localized,
  or too literal for the intended financial audience.
- Chinese variants collapse into one generic Traditional/Simplified form where
  Taiwan, Hong Kong, and Mainland usage materially differ.
- Korean uses translated technical nouns or stacked modifiers that impede
  reading; English uses unnatural nominalizations, inflated transitions, or
  non-native collocations.
- Punctuation, spacing, honorifics, pronouns, formality, and calls to action do
  not match the target market and surface.

### Trust and credibility friction

- Strong claims such as "proves", "best", "accurate", "institutional-grade",
  "predicts", or guaranteed outcomes appear without visible scope, evidence,
  caveat, or definition.
- A backtest result is presented without its universe, period, comparison basis,
  assumptions, or risk limitations where those details are necessary to avoid a
  misleading impression.
- The copy implies a causal or predictive relationship when the underlying
  indicator only measures sentiment, historical position, or correlation.
- Marketing language conflicts with the feature's real behavior, update cadence,
  subscription entitlement, or data source.

## 2. What not to flag by itself

- Correct and useful repeated product names, key definitions, button labels,
  legal language, data-source notes, or consistent terminology.
- Deliberate parallel structure that improves scanning or comparison.
- Concise factual copy, conventional financial terminology, or a restrained
  professional tone.
- A phrase that appears on an external detector as "AI-like" without a separate
  reader-facing defect supported by context.
- A phrase pattern common in AI outputs when the particular sentence is clear,
  accurate, idiomatic, and useful.

## 3. Localized review expectations

| Locale | Review emphasis |
|---|---|
| `zh-TW` | Natural Taiwan Traditional Chinese; avoid Mainland terms, awkward translationese, over-formal bureaucratic phrasing, and redundant abstract nouns. Use standard Taiwan financial terminology. |
| `zh-HK` | Distinct Hong Kong Traditional Chinese, including local financial and product terminology; avoid treating zh-TW copy as automatically acceptable. Distinguish formal written Chinese from colloquial Cantonese and use the product's chosen register consistently. |
| `zh-CN` | Idiomatic Mainland Simplified Chinese and local financial terminology; avoid Taiwan-specific terms and literal Traditional-to-Simplified conversion. |
| `en` | Idiomatic product and financial English; prefer direct verbs, concrete subjects, restrained claims, and consistent US English unless the product guide specifies otherwise. |
| `ko-KR` | Natural professional Korean with appropriate spacing, particles, sentence endings, and financial terminology; avoid noun stacking, over-literal Sino-Korean phrasing, and repetitive formal sentence frames. |

These are review lenses, not substitutes for approved project terminology or a
market-specific native editor.

## 4. Cross-page comparison

Compare by user intent and semantic role, not just string similarity. Useful
groups include:

- homepage hero, product promise, and primary CTA;
- price-analysis and sentiment-analysis descriptions;
- indicator definitions, methodology, limitations, and source notes;
- FAQ question/answer families;
- article titles, leads, section headings, conclusions, and related CTAs;
- subscription, trial, payment, and account disclosures;
- SEO titles and descriptions for equivalent localized routes.

For each suspected repeated pattern, identify at least two locations, explain
whether the content is semantically the same, and distinguish useful consistency
from copy-paste repetition. Do not require every page to have a unique voice or
invent variety in controls and labels.

## 5. Audit output

Recommended Markdown report structure:

1. **Scope and method** — locales, pages, content types, source snapshot, live
   rendered pages actually inspected, and retrieval limitations.
2. **Coverage** — URL count, route families, resource files / keys, article
   editions, SEO surfaces, exclusions, and unresolved fallback coverage.
3. **Executive findings** — distinct root issues by severity and locale.
4. **Findings** — ID, severity, locale, route, locator, exact excerpt, category,
   evidence, explanation, confidence, proposed revision or verification owner.
5. **Cross-locale and cross-page patterns** — repeated templates, terminology
   drift, and source-copy defects.
6. **Not verified** — claims requiring product/data/legal evidence and pages or
   interactive states not captured.
7. **Next actions** — prioritized corrections, explicitly separated from work
   already performed.

Use this finding shape for machine-readable exports:

```json
{
  "id": "COPY-001",
  "severity": "P1",
  "locale": "zh-TW",
  "route": "/zh-TW/market-sentiment",
  "locator": "FAQ / question text or resource key",
  "category": "generic_copy | mechanical_pattern | repetition | translationese | locale_fit | claim_verification",
  "excerpt": "Exact current wording",
  "evidence": ["rendered page", "source file path and key"],
  "issue": "Specific reader-facing problem",
  "confidence": "high | medium | low",
  "recommendation": "Minimal safer rewrite or verification needed",
  "owner": "locale editor | product owner | data owner | legal owner"
}
```

## 6. External AI detectors

An external AI detector may be used only as an optional prioritization signal
when the user explicitly requests it and access, language coverage, data
handling, and current terms are verified. Do not upload unpublished, private,
customer, or sensitive copy to a third-party service without authorization.
Record the tool, date, language coverage, and content sent. Detector scores are
not proof of authorship or naturalness. A high score does not automatically
create a finding, and a low score does not clear a page.
