/**
 * One JSON registry is shared by the client, locale chunk routing and the
 * CommonJS SEO build script. Keep all published explainer routes here.
 *
 * `boardItemId` maps to GET /api/sentiment-board. That endpoint remains the
 * only source of live values on these pages; plan-aware historical endpoints
 * are deliberately not called here.
 */
import indicatorPageDefinitions from './indicatorPages.json';

export const INDICATOR_PAGES = indicatorPageDefinitions;

export const PUBLISHED_INDICATOR_PAGES = INDICATOR_PAGES.filter((page) => page.published);

export const findIndicatorPage = (slug) =>
  PUBLISHED_INDICATOR_PAGES.find((page) => page.slug === slug) || null;
