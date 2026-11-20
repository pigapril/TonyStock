# Frontend locale expansion

The frontend locale registry is `Web/frontend/src/locales/localeConfig.js`.
Do not add another language by copying `en` / `zh-TW` conditionals throughout
the application.

## Add a UI locale

1. Add one entry to `LOCALES` with its BCP 47 locale code, native display name,
   `intlLocale`, fallback chain, and any optional presentation metadata such as
   `writingSystem` and `socialAssetSuffix`.
2. Add `src/locales/<locale>/translation.json` with the same runtime keys as the
   default locale. `npm run locales:check` checks generated resources and the
   generated loader registry; `node scripts/verify-i18n-keys.js` checks static
   translation calls against every enabled locale.
3. Run `node scripts/generate-locale-resources.js`. It derives shared bundles,
   route bundles, and `src/locales/localeResources.generated.js` from the
   registry. Do not edit the generated file or `resources/<locale>/*.json` by
   hand. Commit the generated outputs with the source locale file.
4. Add `public/manifest.<locale>.json` and localized social preview assets under
   `public/images/social/<locale>/`. Use a localized homepage artwork crop in
   `src/config/socialHeroSnapshot.json` only when the in-product screenshot is
   actually localized; otherwise generate a text-led card rather than reuse a
   screenshot containing another language.
5. Add the locale's public route URLs and reciprocal `hreflang` entries to
   `public/sitemap.xml`. The production build checks that every enabled locale
   has all public SEO routes represented in the sitemap and a manifest.
6. Review localized copy length and responsive layouts, plus dynamic content
   supplied by APIs, announcements, customer support, payment flows, and email
   notifications. The frontend registry does not automatically localize
   backend-generated content or editorial articles.

## Existing compatibility rules

- `/zh/*` is a legacy alias that redirects to `/zh-TW/*`; it is not a separate
  translation. Keep aliases in `LEGACY_LOCALE_ALIASES`, not in `LOCALES`.
- The URL locale takes precedence over browser language. Browser detection is
  used only at `/` and falls back to `DEFAULT_LOCALE` when no enabled locale
  matches.
- Feature copy is loaded by route. `RouteLocaleGate` waits for the requested
  locale and its configured fallback resources before mounting the page.
- Article translations are an editorial inventory, not a consequence of UI
  locale support. Only publish article `hreflang` links when a translated
  article source and URL actually exist.
- Some product routes can be intentionally limited to selected SEO locales;
  declare those exceptions with `seoLocales` in `scripts/generate-seo-shells.js`
  and keep the sitemap's reciprocal alternates aligned. The sponsor page is a
  current Taiwan-only SEO route.
