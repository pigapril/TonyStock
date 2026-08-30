import React, { useCallback, useEffect, useState } from 'react';

export const TOUR_STORAGE_KEY = 'sio.priceAnalysis.tourSeen.v1';

// 依序聚焦：輸入框 → 開始分析 → 右邊結果
const STEPS = [
  { key: 'input', selector: '.stock-input-wrapper' },
  { key: 'submit', selector: '.analysis-button' },
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

  if (!rect) {
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
  const centeredLeft = clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2);

  let cardTop;
  let cardLeft;
  if (vh - (rect.top + rect.height) > CARD_HEIGHT + CARD_GAP) {
    cardTop = rect.top + rect.height + CARD_GAP;
    cardLeft = centeredLeft;
  } else if (rect.top > CARD_HEIGHT + CARD_GAP) {
    cardTop = rect.top - CARD_GAP - CARD_HEIGHT;
    cardLeft = centeredLeft;
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
      <div
        className="pa-tour__spotlight"
        style={{
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`
        }}
      />

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
