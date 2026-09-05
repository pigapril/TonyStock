import {
  classifySentiment,
  sentimentLevel,
  getHorizonAlignment,
  isAllHorizonsExtreme,
  canEvaluateHorizons,
  getSignalLadder
} from '../signalLadder';

// 一組好讀的線值：中線 100，1σ = 10。
const bands = (opts = {}) => ({
  tl_minus_2sd: 80,
  tl_minus_sd: 90,
  tl_plus_sd: 110,
  tl_plus_2sd: 120,
  ...opts
});

describe('classifySentiment', () => {
  it('落在 ±1σ 之內是中性', () => {
    expect(classifySentiment(100, bands())).toBe('priceAnalysis.sentiment.neutral');
  });

  it('±1σ 是嚴格比較：剛好等於 1σ 仍算中性', () => {
    // ±2σ 用 >=／<=，±1σ 用 >／<，把運算子寫錯這裡會紅。
    expect(classifySentiment(110, bands())).toBe('priceAnalysis.sentiment.neutral');
    expect(classifySentiment(90, bands())).toBe('priceAnalysis.sentiment.neutral');
    expect(classifySentiment(110.01, bands())).toBe('priceAnalysis.sentiment.greed');
    expect(classifySentiment(89.99, bands())).toBe('priceAnalysis.sentiment.fear');
  });

  it('跌破 -2σ 是極度恐懼，剛好等於也算', () => {
    expect(classifySentiment(79, bands())).toBe('priceAnalysis.sentiment.extremeFear');
    expect(classifySentiment(80, bands())).toBe('priceAnalysis.sentiment.extremeFear');
  });

  it('突破 +2σ 是極度貪婪，剛好等於也算', () => {
    expect(classifySentiment(121, bands())).toBe('priceAnalysis.sentiment.extremeGreed');
    expect(classifySentiment(120, bands())).toBe('priceAnalysis.sentiment.extremeGreed');
  });

  it('陣列（sdAnalysis）與純數字（horizonSnapshots）兩種形狀結果相同', () => {
    const asArrays = {
      tl_minus_2sd: [1, 2, 80],
      tl_minus_sd: [1, 2, 90],
      tl_plus_sd: [1, 2, 110],
      tl_plus_2sd: [1, 2, 120]
    };
    expect(classifySentiment([9, 9, 79], asArrays)).toBe(classifySentiment(79, bands()));
  });

  it('缺值回 null，不會把 null 當成 0 而誤判極度貪婪', () => {
    expect(classifySentiment(100, bands({ tl_plus_2sd: null }))).toBeNull();
    expect(classifySentiment(null, bands())).toBeNull();
    expect(classifySentiment(100, null)).toBeNull();
  });
});

describe('getHorizonAlignment / isAllHorizonsExtreme', () => {
  it('三個期長都算得出來時各自給位階', () => {
    const a = getHorizonAlignment(79, { short: bands(), medium: bands(), long: bands() });
    expect(sentimentLevel(a.short)).toBe('extremeFear');
    expect(sentimentLevel(a.medium)).toBe('extremeFear');
    expect(sentimentLevel(a.long)).toBe('extremeFear');
    expect(isAllHorizonsExtreme(a, 'extremeFear')).toBe(true);
  });

  it('只要有一個期長不是極端，就不算三個都到', () => {
    const a = getHorizonAlignment(79, {
      short: bands(),
      medium: bands({ tl_minus_2sd: 10 }), // 中期還沒到極端
      long: bands()
    });
    expect(isAllHorizonsExtreme(a, 'extremeFear')).toBe(false);
  });

  it('後端沒回 horizonSnapshots 時不當成達成', () => {
    const a = getHorizonAlignment(79, null);
    expect(a.short).toBeNull();
    expect(a.long).toBeNull();
    expect(isAllHorizonsExtreme(a, 'extremeFear')).toBe(false);
  });

  it('三格都只看後端的快照，不受使用者當下選的期長影響', () => {
    // 使用者把期長切成半年時，畫面上那條線是半年的。曾經拿它當「3.5 年的位階」，
    // 結果 3.5 年那格會跟著期長變，另外兩格永遠是「—」。
    const a = getHorizonAlignment(79, {
      short: bands(),                       // 半年：極度恐懼
      medium: bands({ tl_minus_2sd: 10 }),  // 1.5 年：還沒到極端
      long: bands({ tl_minus_2sd: 10 })     // 3.5 年：還沒到極端
    });
    expect(sentimentLevel(a.short)).toBe('extremeFear');
    expect(sentimentLevel(a.medium)).not.toBe('extremeFear');
    expect(sentimentLevel(a.long)).not.toBe('extremeFear');
  });

  it('後端只給得出部分期長時，其餘是無法判斷而不是未達成', () => {
    // 上市未滿 3.5 年的標的，後端切不出長視窗，那一格就沒有快照。
    const a = getHorizonAlignment(79, { short: bands(), medium: bands() });
    expect(sentimentLevel(a.short)).toBe('extremeFear');
    expect(a.long).toBeNull();
    expect(canEvaluateHorizons(a)).toBe(false);
  });
});

describe('getSignalLadder', () => {
  const fearAll = getHorizonAlignment(79,
    { short: bands(), medium: bands(), long: bands() });

  it('非極端位階不產生階梯', () => {
    expect(getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.fear', alignment: fearAll
    })).toBeNull();
  });

  it('不列樂活通道那一項——卡片標題已經寫過通道狀態，列進來就是同一句話講兩遍', () => {
    const l = getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeFear', alignment: fearAll
    });
    expect(l.steps.map((s) => s.key)).toEqual(['horizons']);
    expect(l.steps[0].met).toBe(true);
  });

  it('有市場資料時才出現第二項，而且只回傳成不成立', () => {
    // 當日廣度的百分比刻意不往外送：那個數字要先知道池子是哪些標的、門檻怎麼定
    // 才讀得懂，寫到畫面上等於要使用者先讀懂我們的驗證設計。
    const l = getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeFear',
      alignment: fearAll,
      marketExtreme: { extremeFear: true, extremeGreed: false, fearPct: 31.2, greedPct: 0 }
    });
    expect(l.steps.map((s) => s.key)).toEqual(['horizons', 'market']);
    expect(l.steps[1]).toEqual({ key: 'market', met: true });
  });

  it('市場那一項要看對應那一側，不能把整個物件當布林用', () => {
    // marketExtreme 是物件，Boolean(物件) 永遠是 true；恐懼側要讀 extremeFear。
    const market = { extremeFear: false, extremeGreed: true, fearPct: 2, greedPct: 40 };
    const fear = getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeFear', alignment: fearAll, marketExtreme: market
    });
    // 大盤是貪婪側到極端，恐懼側這一項就不算達成
    expect(fear.steps[1].met).toBe(false);
  });

  it('三個長度算不齊時整項不列出來——「未達成」是在說已經確認過，跟「無從判斷」不同', () => {
    // 使用者把分析期長改成半年，後端就沒有 1.5 年與 3.5 年的資料可判斷。
    const partial = getHorizonAlignment(79,
      { short: bands() });   // 缺 medium
    expect(canEvaluateHorizons(partial)).toBe(false);
    expect(getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeFear', alignment: partial
    })).toBeNull();
  });

  it('貪婪側不產生階梯——那組數字只在恐懼側成立', () => {
    // 標題說的是「一年後上漲的機率更高」，這在貪婪側方向是反的：多滿足幾個條件，
    // 後續是略差（−0.6 ~ −1.8pp、54–64% 同方向），而且弱到不構成訊號。
    // 兩側共用同一組階梯等於把結論講反。
    const greedAll = getHorizonAlignment(121,
      { short: bands(), medium: bands(), long: bands() });
    expect(getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeGreed', alignment: greedAll
    })).toBeNull();
    expect(getSignalLadder({
      sentimentKey: 'priceAnalysis.sentiment.extremeGreed',
      alignment: greedAll,
      marketExtreme: { extremeFear: false, extremeGreed: true, fearPct: 0, greedPct: 40 }
    })).toBeNull();
  });
});

describe('燈號要顯示的三個長度', () => {
  const snap = { tl_minus_2sd: 80, tl_minus_sd: 90, tl_plus_sd: 110, tl_plus_2sd: 120 };

  it('三盞燈都讀各自的快照', () => {
    const a = getHorizonAlignment(70, { short: snap, medium: snap, long: snap });
    expect([a.short, a.medium, a.long].every(Boolean)).toBe(true);
  });

  // 「切換圖表週期不會改變三盞燈」原本是比對不同 selectedYears 的結果。
  // 現在函式根本不吃週期參數，那個比對會變成自己比自己；改成直接釘住
  // 每一格讀的是自己那份快照——週期切換影響不到它，是因為它讀不到週期。
  it('每一格讀的是自己那一份快照，不會互相串到', () => {
    const fearSnap = { tl_minus_2sd: 80, tl_minus_sd: 90, tl_plus_sd: 110, tl_plus_2sd: 120 };
    const calmSnap = { tl_minus_2sd: 10, tl_minus_sd: 20, tl_plus_sd: 110, tl_plus_2sd: 120 };
    const a = getHorizonAlignment(70, { short: fearSnap, medium: calmSnap, long: calmSnap });
    expect(sentimentLevel(a.short)).toBe('extremeFear');
    expect(sentimentLevel(a.medium)).toBe('neutral');
    expect(sentimentLevel(a.long)).toBe('neutral');
  });

  it('缺少某一週期快照時只有該週期顯示無資料', () => {
    const a = getHorizonAlignment(70, { short: snap, medium: snap });
    expect(a.short).toBeTruthy();
    expect(a.medium).toBeTruthy();
    expect(a.long).toBeNull();
  });
});
