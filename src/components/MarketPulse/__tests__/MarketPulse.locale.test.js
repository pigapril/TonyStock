import { MARKETS } from '../MarketPulse';
import { resolveMarketLocaleText } from '../../MarketSentimentIndex/marketLocaleCopy';

describe('MarketPulse market labels', () => {
  it('provides reviewed Korean names for all displayed markets', () => {
    expect(MARKETS.map(({ labels }) => resolveMarketLocaleText(labels, 'ko-KR'))).toEqual([
      'S&P 500',
      '나스닥 100',
      '다우존스 산업평균지수',
      '대만 가권지수',
      '닛케이 225',
      '상하이 종합지수',
      '코스피',
      '항셍지수',
      'FTSE 100'
    ]);
  });

  it('preserves existing English and Chinese labels', () => {
    expect(resolveMarketLocaleText(MARKETS[2].labels, 'en')).toBe('Dow Jones');
    expect(resolveMarketLocaleText(MARKETS[2].labels, 'zh-TW')).toBe('道瓊工業');
    expect(resolveMarketLocaleText(MARKETS[2].labels, 'zh-CN')).toBe('道琼斯工业指数');
  });
});
