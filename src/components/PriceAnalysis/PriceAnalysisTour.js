import React, { useCallback, useEffect, useState } from 'react';
import { TOUR_STORAGE_KEY } from './tourStorageKey';

// 依序聚焦：搜尋列 → 期長/進階 → 結果圖表
const STEPS = [
  { key: 'search', selector: '.pa-searchbar' },
  { key: 'period', selector: '.pa-searchbar__controls' },
  { key: 'result', selector: '.chart-card' }
];

const CARD_WIDTH = 300;
const CARD_HEIGHT = 200; // 估高，用來決定卡片放哪一側
const CARD_GAP = 14;
const PADDING = 6;

function readRect(selector) {
  const el = document.querySelector(selector);
  if (!el) {
    return null;
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) {
    return null;
  }
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2
  };
}

/**
 * 首次造訪的蓋板導覽：依序把輸入框、分析按鈕、結果區挖空highlight。
 * 只跑一次（記在 localStorage），Escape 或「略過」可隨時離開。
 */
function PriceAnalysisTour({ t, onFinish }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  // 目標重試過還是量不到（這一步的區塊這次沒 render）
  const [missing, setMissing] = useState(false);

  const step = STEPS[index];

  const measure = useCallback(() => {
    setRect(readRect(STEPS[index].selector));
  }, [index]);

  // 換一步就先把目標捲進畫面再量位置。
  // 捲動用 'auto' 而非 'smooth'：平滑捲動期間量到的是移動中的座標，
  // 聚光框會停在錯的位置（實測會差一整列）。
  useEffect(() => {
    const el = document.querySelector(STEPS[index].selector);
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    measure();

    // 捲動位置與版面可能還會微調（圖表重繪、字體載入），短時間內多量幾次保險
    const timers = [60, 200, 450].map((delay) => window.setTimeout(measure, delay));

    // 重試都過了還是量不到，代表這一步的目標這次根本沒 render。
    // 不是每個區塊都一定在畫面上（例如只有極度恐懼／貪婪時才出現的那段），
    // 這種時候直接跳下一步；最後一步則交給下面的置中 fallback。
    setMissing(false);
    timers.push(window.setTimeout(() => {
      if (readRect(STEPS[index].selector)) {
        return;
      }
      if (index < STEPS.length - 1) {
        setIndex(index + 1);
      } else {
        setMissing(true);
      }
    }, 600));

    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [index, measure]);

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, '1');
    } catch (error) {
      // 無痕模式或關閉儲存時忽略：頂多下次再看一次導覽
    }
    onFinish();
  }, [onFinish]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        finish();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  // 還沒量到、也還沒確定量不到：等這一輪重試量完再畫，避免卡片先閃一下置中位置。
  if (!rect && !missing) {
    return null;
  }

  const isLast = index === STEPS.length - 1;

  // 依序試「下方 → 上方 → 左側 → 右側」，挑第一個放得下的。
  // 目標很大時（例如整張圖表卡）上下都塞不下，這時要放到旁邊，
  // 否則卡片會直接壓在圖上，把要介紹的東西擋住。
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (value) => Math.min(Math.max(value, CARD_GAP), Math.max(CARD_GAP, vw - CARD_WIDTH - CARD_GAP));
  const clampTop = (value) => Math.min(Math.max(value, CARD_GAP), Math.max(CARD_GAP, vh - CARD_HEIGHT - CARD_GAP));

  let cardTop;
  let cardLeft;
  if (!rect) {
    // 量不到就不畫聚光框，卡片擺中間。這裡曾經直接 return null，結果連「略過」
    // 都跟著消失，使用者被關在一個沒有出口的半截導覽裡。
    cardTop = clampTop(vh / 2 - CARD_HEIGHT / 2);
    cardLeft = clampLeft(vw / 2 - CARD_WIDTH / 2);
  } else if (vh - (rect.top + rect.height) > CARD_HEIGHT + CARD_GAP) {
    cardTop = rect.top + rect.height + CARD_GAP;
    cardLeft = clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2);
  } else if (rect.top > CARD_HEIGHT + CARD_GAP) {
    cardTop = rect.top - CARD_GAP - CARD_HEIGHT;
    cardLeft = clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2);
  } else if (rect.left > CARD_WIDTH + CARD_GAP) {
    cardTop = clampTop(rect.top + rect.height / 2 - CARD_HEIGHT / 2);
    cardLeft = rect.left - CARD_GAP - CARD_WIDTH;
  } else {
    cardTop = clampTop(rect.top + rect.height / 2 - CARD_HEIGHT / 2);
    cardLeft = clampLeft(rect.left + rect.width + CARD_GAP);
  }

  return (
    <div className="pa-tour" role="dialog" aria-modal="true" aria-label={t('priceAnalysis.tour.ariaLabel')}>
      {/* 用超大 box-shadow 把目標以外的地方壓暗，形成聚光效果 */}
      {rect ? (
        <div
          className="pa-tour__spotlight"
          style={{
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`
          }}
        />
      ) : null}

      <div
        className="pa-tour__card"
        style={{ top: `${cardTop}px`, left: `${cardLeft}px`, width: `${CARD_WIDTH}px` }}
      >
        <span className="pa-tour__progress">{`${index + 1} / ${STEPS.length}`}</span>
        <h4 className="pa-tour__title">{t(`priceAnalysis.tour.${step.key}.title`)}</h4>
        <p className="pa-tour__body">{t(`priceAnalysis.tour.${step.key}.body`)}</p>

        <div className="pa-tour__actions">
          <button type="button" className="pa-tour__skip" onClick={finish}>
            {t('priceAnalysis.tour.skip')}
          </button>
          <div className="pa-tour__nav">
            {index > 0 ? (
              <button type="button" className="pa-tour__back" onClick={() => setIndex(index - 1)}>
                {t('priceAnalysis.tour.back')}
              </button>
            ) : null}
            <button
              type="button"
              className="pa-tour__next"
              onClick={() => (isLast ? finish() : setIndex(index + 1))}
            >
              {isLast ? t('priceAnalysis.tour.done') : t('priceAnalysis.tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PriceAnalysisTour;
