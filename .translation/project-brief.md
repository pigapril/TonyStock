# Translation project brief

Status: approved

## Product

- Name: Sentiment Inside Out (SIO)
- Summary: A stock-market analytics website that presents price trends and market sentiment through LOHAS Five-Line analysis, market sentiment indicators, market momentum tools, watchlists, educational articles, and subscription features.
- Audience: Japanese-reading investors who use the existing US-stock and Taiwan-stock research features. The product does not gain Japan-stock coverage as part of this localization.

## Scope

- Source content: The complete existing zh-TW user-facing website and its approved source copy, including 2,683 current frontend translation leaf strings across 11 resource groups, source strings outside locale JSON when user-visible, four published article editions (article IDs 1, 2, 4, and 5), SEO metadata, backend ChatWidget FAQ (79 Q&A entries), chatbot instructions and fixed replies, transactional emails, subscription and payment notifications, price-sentiment alerts, and invoice-facing locale formatting.
- Surfaces: Responsive public and authenticated web UI, navigation and language selector, SEO and social metadata, article index and article bodies, FAQ and ChatWidget, account and subscription flows, payment and payment-result screens, legal notices, transactional email, watchlist notifications, and invoice output.
- Domains: Financial markets, US stocks, Taiwan stocks, market sentiment, technical analysis, volatility and standard-deviation bands, market indicators, market momentum, ETFs, subscriptions, payment operations, customer support, and legal/product disclosures.
- Constraints: Preserve all source claims, definitions, calculations, thresholds, sample counts, periods, data sources, update cadences, qualifications, prices, billing terms, refunds, disclosures, user/agent roles, placeholders, identifiers, links, markup, and product behavior. Do not add Japan-stock coverage or imply Japanese-market data exists. Keep the payment-provider locale separate from the application locale: ja-JP must remain the application return and notification locale, while ECPay continues receiving its existing supported English service locale (ENG); do not change ECPay parameters or payment behavior for localization. Missing Japanese strings must use the approved English fallback rather than silently displaying Chinese. Keep TWD/USD, Taiwan market names, Taipei time, and source market context accurate.

## Authority and approvals

- Explicit requirements: Translate from zh-TW to ja-JP for the full website. Use natural Japanese financial-product language rather than literal translation. Cover the entire current user-facing frontend and backend scope above. Preserve product facts and system behavior. Approval was given in this conversation on 2026-11-26.
- Approved reviewers: AI translation and machine QA are authorized for drafting and technical/language checks. No Japanese native-language human reviewer has been assigned; native review remains pending and must not be claimed as completed.
- Approved external specialists: None. Use the repository's bundled translation workflow and its Japanese target-language profile; do not install or invent external specialists.

## Outputs

- Formats: JSON locale resources, JavaScript/JSX user-facing strings where needed, Markdown articles, HTML email templates, metadata and generated locale resources, route/SEO/manifest/sitemap configuration, and backend notification/chat locale handling.
- Delivery location: Frontend repository and backend repository; project decisions and terminology records in frontend `.translation/`.
- Acceptance criteria: Full zh-TW key and placeholder parity for ja-JP; no untranslated zh-TW strings in supported Japanese user-facing surfaces except protected proper nouns and explicitly approved fallback; natural and consistent Japanese using です・ます体 for prose; accurate financial terminology; preserved source claims, numbers, dates, units, markup, links, and product behavior; all four published articles available and linked in ja-JP; correct ja-JP routes, browser-language selection, persistence, SEO/hreflang, manifest, sitemap, transactional notifications, and ChatWidget FAQ; ECPay continues using its existing English provider locale while return URLs and application notifications use ja-JP; all applicable locale/resource/article checks pass. Human native review is tracked separately. Do not deploy or commit/push unless separately requested.
- Runtime UI review: auto
