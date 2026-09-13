import zhTW from '../zh-TW/translation.json';
import en from '../en/translation.json';

// 這支測試釘的是 Tony 在 2026-09-05 逐條點名的文案問題。每一條都對應一次真實的
// 回饋，不是憑空的風格潔癖——會漂回去的通常就是這幾種。
//
// 判準：使用者不會為了看懂一句話去翻我們的回測過程。看似專業但讀完不知道要幹嘛的
// 句子，一律拿掉。

const collectStrings = (node, out = []) => {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((v) => collectStrings(v, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => collectStrings(v, out));
  return out;
};

const scopes = (dict) => ({
  priceAnalysis: dict.priceAnalysis,
  marketFearBreadth: dict.sentimentIndicatorPages.marketFearBreadth
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s 文案體檢', (lang, dict) => {
  const strings = collectStrings(scopes(dict));

  // 「這正是把兩個數字放在一起看的原因」——上一句才剛講完，再講一次只是拉長。
  it('不用自我指涉的補述把上一句再講一次', () => {
    const patterns = lang === 'zh-TW'
      ? [/這(正)?就?是[^。]{0,20}的原因/, /差別在於/, /才有[^。]{0,10}的意義/]
      : [/which is why/i, /the difference is that you/i];
    strings.forEach((s) => {
      patterns.forEach((re) => expect(s).not.toMatch(re));
    });
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：同一組說明不能自相矛盾', (lang, dict) => {
  // 五線譜彈窗曾經 point1 說最外面兩條「已經是很少見的位置」，point3 說「大約每十個
  // 交易日出現一次，沒有想像中罕見」。使用者讀完只會更困惑。
  it('罕見度只講一次，而且不能同時給出相反的說法', () => {
    Object.values(dict.priceAnalysis.description).forEach((group) => {
      const text = collectStrings(group).join(' ');
      const saysRare = lang === 'zh-TW'
        ? /(?<!不算|沒有想像中)罕見|很少見/.test(text)
        : /\brare\b/.test(text) && !/not rare|less rare/.test(text);
      const saysNotRare = lang === 'zh-TW'
        ? /不算罕見|沒有想像中罕見|不罕見/.test(text)
        : /not rare|less rare/.test(text);
      expect(saysRare && saysNotRare).toBe(false);
    });
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：兩張圖的差別要講基準，不是講時間長短', (lang, dict) => {
  // 曾經寫成「五線譜看長期位階、樂活通道看短期冷熱」。這個分法不成立：五線譜的期長
  // 是使用者選的，選 0.5 年（約 26 週）跟樂活通道的 20 週幾乎一樣長。
  // 真正的差別是基準——五線譜比趨勢線，樂活通道比最近 20 週走過的價格區間。
  it('不用「長期位階／短期冷熱」當兩張圖的分界', () => {
    const text = collectStrings(dict.priceAnalysis).join(' ');
    const patterns = lang === 'zh-TW'
      ? [/長期位階/, /短期冷熱/, /短期的冷熱/]
      : [/long-term position/i, /short-term heat/i];
    patterns.forEach((re) => expect(text).not.toMatch(re));
  });

  // 期長按鈕上寫的是 0.5 年／1.5 年／3.5 年，文案不能還在講舊下拉選單的「短期／中期」
  it('期長用年數稱呼，不用舊下拉選單的短期／中期', () => {
    if (lang !== 'zh-TW') return;
    const text = collectStrings(dict.priceAnalysis.tour).join(' ');
    expect(text).not.toMatch(/短期或中期|中期或短期/);
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：從讀的人那一邊寫', (lang, dict) => {
  // 「碰到最上緣，上面就顯示「極度貪婪」」——在描述畫面怎麼運作，不是在講那代表什麼。
  it('說那代表什麼，不是說畫面上會出現什麼', () => {
    if (lang !== 'zh-TW') return;
    const text = collectStrings(dict.priceAnalysis.description).join(' ');
    expect(text).not.toMatch(/上面就顯示/);
  });

  // 四張狀態卡一次只出現一張。「出現次數是上面那種的兩倍」指的是使用者根本看不到的卡。
  it('狀態卡不指涉另一張看不到的卡', () => {
    if (lang !== 'zh-TW') return;
    Object.values(dict.priceAnalysis.combined).forEach(({ body }) => {
      expect(body).not.toMatch(/上面那(種|張|個)|下面那(種|張|個)/);
    });
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：一個概念只有一個名字', (lang, dict) => {
  // 樂活通道曾經叫「短期過熱／短期過冷」——「短期」不成立（五線譜可以只選 0.5 年），
  // 而且「過熱／過冷」是跟「貪婪／恐懼」平行的第三套情緒詞。現在改成位置詞，
  // 情緒詞留給五線譜獨用。
  it('樂活通道用位置詞，情緒詞留給五線譜', () => {
    const text = collectStrings(scopes(dict)).join(' ');
    const patterns = lang === 'zh-TW'
      ? [/短期過熱/, /短期過冷/]
      : [/short-term overheated/i, /short-term oversold/i];
    patterns.forEach((re) => expect(text).not.toMatch(re));
    expect(dict.priceAnalysis.channel.above).toBeTruthy();
    expect(dict.priceAnalysis.channel.below).toBeTruthy();
  });

  // FAQ 曾經自成一套「極度樂觀／極度悲觀」，跟畫面上的「極度貪婪／極度恐懼」對不起來。
  it('不使用第三套情緒詞（樂觀／悲觀）', () => {
    const text = collectStrings(scopes(dict)).join(' ');
    const patterns = lang === 'zh-TW'
      ? [/極度樂觀/, /極度悲觀/]
      : [/extreme optimism/i, /extreme pessimism/i];
    patterns.forEach((re) => expect(text).not.toMatch(re));
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：數字要說清楚是誰的數字', (lang, dict) => {
  // 2026-09-05 Tony 查 6184（台股個股）時發現卡片寫「未來一個月內上漲的機率是 70%」。
  // 那組數字的樣本是指數型 ETF，而且 70% 是它的三個月數字——一個月是 69%，台股個股
  // 只有 63%。原本的文案有寫「回測 37 檔指數型 ETF」，被改成「依照歷史經驗」之後，
  // 數字看起來就像對任何標的都成立。
  it('狀態卡引用百分比時要講樣本', () => {
    Object.entries(dict.priceAnalysis.combined).forEach(([state, { body }]) => {
      if (!/\d+%/.test(body)) return;
      // 講樣本的方式不只一種（「回測 39 檔指數型 ETF」「根據歷史數據回測，若是…」），
      // 所以認的是「有沒有交代這組數字量的是誰」，不是特定句型。
      const namesSample = lang === 'zh-TW'
        ? /回測/.test(body)
        : /\bbacktested\b|\bacross\b/i.test(body);
      expect(`${state}: ${namesSample}`).toBe(`${state}: true`);
    });
  });

  // 廣度是固定池算的（美股 28 檔 ETF／台股 38 檔大型股）。把檔數、門檻或當日百分比
  // 寫進畫面，等於要使用者先讀懂我們的驗證設計：他會問「為什麼 38 檔就叫整個市場」。
  // 這一行只需要回答一件事——不只他這一檔，大盤也是。
  it('訊號階梯不把驗證設計搬到畫面上', () => {
    const text = collectStrings(dict.priceAnalysis.ladder).join(' ');
    const patterns = lang === 'zh-TW'
      ? [/\{\{pct\}\}/, /\{\{total\}\}/, /\d+\s*檔/, /門檻/, /比例/]
      : [/\{\{pct\}\}/, /\{\{total\}\}/, /\bthreshold\b/i, /\d+\s*holdings/i];
    patterns.forEach((re) => expect(text).not.toMatch(re));
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：數字要能讓人決定下一步', (lang, dict) => {
  // 五線譜彈窗曾經寫「大約每十天出現一次，不算罕見」。那是回測跑出來的頻率，
  // 讀者知道了也決定不了任何事。這一頁的數字要接得上「所以我該看什麼」。
  it('圖表說明不放單純的出現頻率', () => {
    const text = collectStrings(dict.priceAnalysis.description).join(' ');
    const patterns = lang === 'zh-TW'
      ? [/每十天/, /每[0-9一二三四五六七八九十]+個?交易日出現/, /出現一次/]
      : [/one day in ten/i, /happens roughly once/i];
    patterns.forEach((re) => expect(text).not.toMatch(re));
  });
});

describe.each([['zh-TW', zhTW], ['en', en]])('%s：沿用畫面上已經有的詞', (lang, dict) => {
  // 同一段裡一下「便宜」一下「高檔」，跟畫面上的「極度恐懼／貪婪」又是第三套講法。
  it('週期說明用畫面上的情緒名稱，不另創一套', () => {
    const horizons = collectStrings(dict.priceAnalysis.description.horizons).join(' ');
    const banned = lang === 'zh-TW' ? ['便宜', '高檔', '低檔'] : ['cheap', 'expensive'];
    banned.forEach((word) => expect(horizons.toLowerCase()).not.toContain(word.toLowerCase()));
    // 英文句中會小寫（the chart may say extreme fear），比對不分大小寫
    const sentiment = dict.priceAnalysis.sentiment;
    expect(horizons.toLowerCase()).toContain(sentiment.extremeFear.toLowerCase());
  });
});
