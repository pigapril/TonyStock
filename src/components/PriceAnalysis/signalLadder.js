/**
 * 訊號階梯：五線譜位階 → 三個期長是否同時到極端 → 市場整體是否也在極端。
 *
 * 為什麼要分階：2026-09 用 890 檔美股個股與 895 檔台股上市回測，一年後的上漲機率
 *   平常                                 67% / 57%
 *   極度恐懼 ＋ 跌破通道下緣（現有訊號）    76% / 72%
 *   ＋ 長中短期都是極度恐懼                 78% / 70%
 *   ＋ 連整個市場都是極度恐懼               90% / 83%
 * 每多一個條件，出現頻率就從一年 5.8 天掉到 1.0 天。所以畫面上要把三階都列出來，
 * 讓使用者看到現在到哪一階、還差什麼，而不是只給一個「有/沒有」。
 *
 * 判定邏輯集中在這裡的原因跟 backend 的 signalTier.js 一樣：三個期長各寫一次遲早會漂移。
 */

const SENTIMENT_PREFIX = 'priceAnalysis.sentiment.';

/** 陣列給最後一筆、純數字直接用；缺值一律 NaN（Number(null) 是 0，會誤判）。 */
const lastNumber = (value) => {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === null || raw === undefined || raw === '') return NaN;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * 五線譜位階。bands 可以是 sdAnalysis（整條陣列）或後端回的 horizonSnapshots（只有最後一筆），
 * 兩種都吃，這樣三個期長走完全相同的判定。
 * @returns {string|null} 例如 'priceAnalysis.sentiment.extremeFear'
 */
export const classifySentiment = (price, bands) => {
  const p = lastNumber(price);
  if (!Number.isFinite(p) || !bands) return null;

  const plus2 = lastNumber(bands.tl_plus_2sd);
  const plus1 = lastNumber(bands.tl_plus_sd);
  const minus1 = lastNumber(bands.tl_minus_sd);
  const minus2 = lastNumber(bands.tl_minus_2sd);
  if (![plus2, plus1, minus1, minus2].every(Number.isFinite)) return null;

  if (p >= plus2) return `${SENTIMENT_PREFIX}extremeGreed`;
  if (p > plus1) return `${SENTIMENT_PREFIX}greed`;
  if (p <= minus2) return `${SENTIMENT_PREFIX}extremeFear`;
  if (p < minus1) return `${SENTIMENT_PREFIX}fear`;
  return `${SENTIMENT_PREFIX}neutral`;
};

/** 從翻譯鍵取出等級後綴，例如 extremeFear。 */
export const sentimentLevel = (key) => (key ? key.split('.').pop() : null);

/** 三個長度各自的年數，跟後端 ALIGNMENT_YEARS 與畫面上的燈號一致。 */
export const HORIZON_YEARS = { short: 0.5, medium: 1.5, long: 3.5 };

/**
 * 三個長度各自的位階。
 *
 * 三個週期都用後端各自算好的 horizonSnapshots。圖表目前選的是哪個週期不會改變
 * 這三個固定週期的狀態，因此切換半年／1.5 年／3.5 年時燈號保持一致。
 *
 * 刻意不吃 sdAnalysis：那條線是使用者當下選的視窗，拿它當「3.5 年的位階」，
 * 3.5 年那格就會跟著期長變。後端已經從完整資料算好三個固定視窗了。
 *
 * @param {object|null} horizonSnapshots 後端回的三個固定視窗線值，缺哪個哪格就無法判斷
 * @returns {{short: string|null, medium: string|null, long: string|null}}
 */
export const getHorizonAlignment = (price, horizonSnapshots) => ({
  short: classifySentiment(price, horizonSnapshots?.short),
  medium: classifySentiment(price, horizonSnapshots?.medium),
  long: classifySentiment(price, horizonSnapshots?.long)
});

const HORIZON_KEYS = ['short', 'medium', 'long'];

/**
 * 三個期長是不是都算得出來。使用者把分析期長改成半年時，後端手上只有半年資料，
 * 中期與長期就無從判斷——這時候不能顯示成「未達成」（那是在說已經確認過了），
 * 而是整項不列出來。
 */
export const canEvaluateHorizons = (alignment) =>
  Boolean(alignment) && HORIZON_KEYS.every((k) => alignment[k]);

/** 三個期長是否都到同一個極端。任何一個算不出來就回 false，不猜。 */
export const isAllHorizonsExtreme = (alignment, level) => {
  if (!alignment) return false;
  return HORIZON_KEYS.every((k) => sentimentLevel(alignment[k]) === level);
};

/**
 * 比標題更嚴格的那幾個條件，以及是否達成。順序固定：越後面越嚴、出現越少。
 *
 * 刻意不列樂活通道那一項：卡片標題本來就寫了通道狀態（「極度恐懼 ＋ 跌破下緣」
 * 或「極度恐懼，但通道還在正常範圍」），清單再寫一次是同一句話講兩遍。標題本身
 * 就是階梯的第一階。
 *
 * 判斷不出來的條件一律不列出來，而不是列成「未達成」——「未達成」是在說
 * 已經確認過了，跟「沒資料可判斷」是兩件事，混在一起會誤導。
 *
 * marketExtreme 是後端 marketBreadth.service 回的物件
 * （{ extremeFear, extremeGreed, fearPct, greedPct, date }），沒有資料時是 null。
 * 恐懼側看 extremeFear、貪婪側看 extremeGreed——不能直接當布林用。
 *
 * 刻意只回傳「成不成立」，不把當日廣度的百分比帶給文案：那個數字要先知道池子是哪些
 * 標的、門檻怎麼定才讀得懂，等於把我們的驗證過程丟到使用者面前。想知道怎麼算的，
 * 站上有「市場恐懼廣度」那一頁。
 *
 * @returns {{level, steps: Array<{key: string, met: boolean, pct?: number}>}|null}
 */
export const getSignalLadder = ({ sentimentKey, alignment, marketExtreme = null }) => {
  const level = sentimentLevel(sentimentKey);
  // 只在恐懼側出現。上面那組數字全部是恐懼側量出來的；貪婪側量過兩次，結論都是
  // 「方向相反而且很弱」——2026-09 用 890 檔美股與 895 檔台股上市回測，貪婪側三個
  // 市場都只有輕微負向（−0.6 ~ −1.8pp、54–64% 同方向），三個月的一致性只有 50–54%。
  // 也就是說：貪婪側多滿足幾個條件，後續不是更好，是略差，而且差得不夠穩定到能當訊號。
  // 之前兩側共用同一個標題（「這些也同時成立的話，一年後上漲的機率更高」），在貪婪側
  // 是把結論講反了。
  if (level !== 'extremeFear') return null;

  const steps = [];
  if (canEvaluateHorizons(alignment)) {
    steps.push({ key: 'horizons', met: isAllHorizonsExtreme(alignment, level) });
  }
  if (marketExtreme) {
    const isFear = level === 'extremeFear';
    steps.push({
      key: 'market',
      met: Boolean(isFear ? marketExtreme.extremeFear : marketExtreme.extremeGreed)
    });
  }

  return steps.length ? { level, steps } : null;
};
