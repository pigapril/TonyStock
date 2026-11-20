const {
  SITE_ORIGIN,
  SITE_NAME,
  canonicalUrl,
  buildSeoTitle,
  normalizeMetaDescription,
} = require('../socialMetadata');

describe('shared SEO metadata helpers', () => {
  test('adds the site name once when the page title does not already contain it', () => {
    expect(buildSeoTitle('LOHAS Five-Line', 'Sentiment Inside Out - Market Sentiment Analysis'))
      .toBe('LOHAS Five-Line | Sentiment Inside Out');
  });

  test.each([
    'Sentiment Inside Out｜市場情緒分析平台',
    'Sentiment Inside Out｜市场情绪分析平台',
    'Sentiment Inside Out | 시장 심리 분석 플랫폼',
  ])('does not append a second brand name to an already branded title: %s', (title) => {
    expect(buildSeoTitle(title)).toBe(title);
  });

  test('uses the fallback title when the page title is empty', () => {
    expect(buildSeoTitle('', 'Sentiment Inside Out - Market Sentiment Analysis'))
      .toBe('Sentiment Inside Out - Market Sentiment Analysis');
    expect(buildSeoTitle('   ')).toBe(SITE_NAME);
  });

  test('keeps canonical URLs on the primary domain when the current URL is a deploy preview', () => {
    expect(canonicalUrl('https://deploy-preview-123--niku-stock.netlify.app/en/priceanalysis?utm_source=test#chart'))
      .toBe(`${SITE_ORIGIN}/en/priceanalysis/`);
  });

  test('normalizes whitespace without imposing a character limit', () => {
    const longDescription = `  ${'Useful page information. '.repeat(12)}  `;
    const normalized = normalizeMetaDescription(longDescription);

    expect(normalized).toBe(longDescription.trim());
    expect(normalized.length).toBeGreaterThan(155);
    expect(normalizeMetaDescription('  A\n  useful\t summary.  ')).toBe('A useful summary.');
    expect(normalizeMetaDescription('   ', 'Fallback description.')).toBe('Fallback description.');
  });
});
