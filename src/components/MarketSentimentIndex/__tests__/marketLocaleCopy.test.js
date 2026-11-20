import {
  getMarketCopyLocale,
  getMarketSentimentUiCopy,
  resolveMarketLocaleText
} from '../marketLocaleCopy';
import { TW_MARKET_SENTIMENT_CONFIG, US_MARKET_SENTIMENT_CONFIG } from '../marketConfigs';

describe('market copy locale resolution', () => {
  it('preserves the current en, zh-TW and zh-CN labels', () => {
    expect(getMarketSentimentUiCopy('recentReference', 'en')).toBe('Recent Reference');
    expect(getMarketSentimentUiCopy('recentReference', 'zh-TW')).toBe('近期參考');
    expect(getMarketSentimentUiCopy('recentReference', 'zh-CN')).toBe('近期参考');
    expect(getMarketSentimentUiCopy('historicalFearLows', 'zh-CN')).toBe('历史极度恐惧低点');
    expect(getMarketSentimentUiCopy('recentReference', 'ko-KR')).toBe('최근 비교 기준');
    expect(getMarketSentimentUiCopy('historicalFearLows', 'ko-KR')).toBe('과거 극단적 공포 저점');
    expect(getMarketSentimentUiCopy('genericIndicatorDetailSummary', 'ko-KR')).toContain('시장 심리');
    expect(getMarketSentimentUiCopy('sentimentViewsAria', 'ko-KR')).toBe('종합 시장 심리 보기 전환');
    expect(getMarketSentimentUiCopy('latestMarketSentiment', 'ko-KR')).toBe('최신 시장 심리');
    expect(getMarketSentimentUiCopy('closeIndicatorDetail', 'ko-KR')).toBe('지표 상세 닫기');
  });

  it('resolves Korean copy and keeps English fallback for unsupported locales', () => {
    expect(getMarketCopyLocale('ko-KR')).toBe('ko-KR');
    expect(getMarketCopyLocale('zh')).toBe('zh-TW');
    expect(getMarketSentimentUiCopy('history', 'ko-KR')).toBe('과거 추이');
    expect(resolveMarketLocaleText({ en: 'English', 'zh-TW': '繁中' }, 'ko-KR')).toBe('English');
  });

  it('keeps Taiwan and US gauge headlines explicitly market-specific', () => {
    expect(resolveMarketLocaleText(US_MARKET_SENTIMENT_CONFIG.currentGaugeHeadline, 'zh-TW'))
      .toBe('當前美股市場情緒');
    expect(resolveMarketLocaleText(US_MARKET_SENTIMENT_CONFIG.currentGaugeHeadline, 'ko-KR'))
      .toBe('현재 미국 시장 심리');
    expect(resolveMarketLocaleText(TW_MARKET_SENTIMENT_CONFIG.currentGaugeHeadline, 'zh-CN'))
      .toBe('当前台湾股市情绪');
    expect(TW_MARKET_SENTIMENT_CONFIG.snapshotGaugeHeadlineFormatter({
      currentLang: 'ko-KR', formattedRestrictionCutoffDate: 'Sep 1, 2026'
    })).toBe('Sep 1, 2026 기준 대만 시장 심리');
  });

  it('keeps existing Taiwan explainer copy and provides reviewed Korean copy', () => {
    const args = { currentCompositeScore: 42, currentCompositeSentimentLabel: 'Fear' };
    const tw = TW_MARKET_SENTIMENT_CONFIG.buildGaugeExplainerCopy({ ...args, currentLang: 'zh-TW' });
    const cn = TW_MARKET_SENTIMENT_CONFIG.buildGaugeExplainerCopy({ ...args, currentLang: 'zh-CN' });
    const en = TW_MARKET_SENTIMENT_CONFIG.buildGaugeExplainerCopy({ ...args, currentLang: 'en' });
    const ko = TW_MARKET_SENTIMENT_CONFIG.buildGaugeExplainerCopy({ ...args, currentLang: 'ko-KR' });
    expect(tw.title).toBe('關於台股恐懼貪婪指標');
    expect(cn.title).toBe('关于台湾股市恐惧与贪婪指数');
    expect(en.title).toBe('About the Taiwan Fear & Greed Index');
    expect(ko.title).toBe('대만 시장 공포·탐욕 지수 소개');
    expect(ko.sections).toHaveLength(3);
    expect(ko.sections[0].title).toBe('1. 대만 시장의 다양한 심리 신호 통합');
  });
});
