# Translation style guide

Status: approved

## Voice and tone

- Voice: Clear, restrained, trustworthy financial-product Japanese. Prioritize concrete information about data, methods, features, limits, and next actions. Avoid generic marketing claims and machine-like stock phrases.
- Formality: Use です・ます体 for user-facing explanations, articles, FAQs, notifications, and legal/product prose. Headings, labels, buttons, and compact table cells may use concise noun phrases. Do not mix だ・である体 into narrative prose.
- Audience relationship: Address Japanese users politely without excessive deference or repeated pronouns. Use 尊敬語／謙譲語 only where the source explicitly requires it. Keep customer-support copy approachable but not childish.

## Conventions

- Capitalization: Preserve approved brand names, tickers, acronyms, product names, and identifiers. Use standard Japanese script and katakana for established loanwords; do not translate product or data-source names inconsistently.
- Punctuation: Use Japanese 、 and 。; use 「」 for quoted UI text and 『』 for titles where natural. Use full-width parentheses for Japanese asides and half-width parentheses around ASCII-only terms. Avoid em dashes; restructure the sentence instead. Use ・ to coordinate loanword nouns.
- Numbers, dates, and currency: Use half-width numerals; dates in prose as YYYY年M月D日 and ISO dates in tables/logs; percentages without a space (40%); preserve all source numeric values and currencies. Use appropriate Japanese counters and spacing (for example, 5 件). Preserve TWD, USD, and Taiwan-local Taipei time where the source specifies them.
- Inclusive language: Use neutral, respectful terms for investors and users. Do not infer or introduce demographic attributes.

## Surface constraints

- Length limits: Preserve meaning first; keep labels and buttons concise enough for existing components. Do not truncate or omit claims to fit without reporting a hard layout conflict.
- Accessibility: Preserve accessible names, alt text, aria labels, and meaningful distinctions. Do not localize code identifiers or opaque values.
- Formatting: Preserve locale keys, JSON types, placeholders, ICU syntax, HTML/Markdown structure, code, URLs, internal route identity, links, article image references, headings, tables, lists, and line-break-sensitive layout. Use one consistent Japanese/ASCII spacing convention per artifact; use Japanese typography rules in the bundled ja profile.
