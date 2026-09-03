import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '../../api/apiClient';
import PageContainer from '../PageContainer/PageContainer';
import { getDecimalPlaces } from '../../utils/priceUtils';
import { PUBLISHED_INDICATOR_PAGES } from './indicatorPages';
import './SentimentBoard.css';

const EXPLAINER_BY_ITEM_ID = Object.fromEntries(
  PUBLISHED_INDICATOR_PAGES.filter((page) => page.boardItemId).map((page) => [page.boardItemId, page.slug])
);

/**
 * 情緒指標總覽。
 *
 * 與 /market-sentiment、/tw-market-sentiment 的分工：那兩頁是 SIO 自家指標的
 * 深度（儀表、分項、歷史圖），這頁是全市場情緒指標的廣度（CNN、BofA、AAII…
 * 各家當前值並排）。廣度與深度混在一起會兩邊都做不好。
 *
 * 免費／付費界線由後端 sentimentBoard.service 決定，前端只負責把 locked 呈現好。
 */
const SentimentBoard = () => {
  const { t } = useTranslation();
  const { lang } = useParams();
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    apiClient.get('/api/sentiment-board')
      .then((res) => {
        if (cancelled) return;
        setBoard(res.data?.data || null);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  const seo = {
    title: t('sentimentBoard.pageTitle'),
    description: t('sentimentBoard.pageDescription'),
    keywords: t('sentimentBoard.keywords')
  };

  if (status === 'loading') {
    return (
      <PageContainer {...seo}>
        <div className="sentiment-board sentiment-board--loading">
          <div className="sentiment-board__skeleton" aria-hidden="true" />
          <p className="sentiment-board__status">{t('sentimentBoard.loading')}</p>
        </div>
      </PageContainer>
    );
  }

  if (status === 'error' || !board) {
    return (
      <PageContainer {...seo}>
        <div className="sentiment-board">
          <p className="sentiment-board__status sentiment-board__status--error">
            {t('sentimentBoard.error')}
          </p>
        </div>
      </PageContainer>
    );
  }

  const isPro = board.userPlan === 'pro';

  return (
    <PageContainer {...seo}>
      <div className="sentiment-board">
        <header className="sentiment-board__header">
          <h1 className="sentiment-board__title">{t('sentimentBoard.heading')}</h1>
          <p className="sentiment-board__subtitle">{t('sentimentBoard.subheading')}</p>
        </header>

        {/* 免費方案看得到整個 dashboard，只是 SIO 自己算的部分停在兩個月前。
            視覺沿用 /market-sentiment 既有的 delay banner，同一件事在站內只有一種長相。 */}
        {board.delayed?.active && (
          <div className="board-delay-banner">
            <div className="board-delay-banner__copy">
              <h2 className="board-delay-banner__title">
                {t('sentimentBoard.delayBannerTitle', { date: board.delayed.until })}
              </h2>
              <p className="board-delay-banner__body">{t('sentimentBoard.delayBannerBody')}</p>
            </div>
            <Link className="board-delay-banner__button" to={`/${lang}/subscription`}>
              {t('sentimentBoard.delayNoticeCta')}
            </Link>
          </div>
        )}

        <section className="sentiment-board__composite" aria-label={t('sentimentBoard.compositeLabel')}>
          <CompositeCard
            label={t('sentimentBoard.compositeUs')}
            data={board.composite.us}
            href={`/${lang}/market-sentiment`}
            t={t}
          />
          <CompositeCard
            label={t('sentimentBoard.compositeTw')}
            data={board.composite.tw}
            href={`/${lang}/tw-market-sentiment`}
            t={t}
          />
        </section>

        {board.divergences && board.divergences.length > 0 && (
          <section className="sentiment-board__divergences">
            <h2 className="sentiment-board__sectionTitle">{t('sentimentBoard.divergenceTitle')}</h2>
            <p className="sentiment-board__sectionNote">{t('sentimentBoard.divergenceNote')}</p>
            <div className="sentiment-board__divergenceGrid">
              {board.divergences.map((item) => {
                const points = [item.left, item.right].map((side) => {
                  const value = side.value ?? side.percentile;
                  return {
                    key: side.key,
                    value,
                    label: sideLabel(t, side.key),
                    pct: Math.min(100, Math.max(0, Number(value) || 0))
                  };
                });

                return (
                  <div key={item.key} className="divergence-card">
                    <div className="divergence-card__head">
                      <p className="divergence-card__label">
                        {t(`sentimentBoard.divergences.${item.key}`, {
                          defaultValue: points.map((p) => p.label).join(' / ')
                        })}
                      </p>
                      <span className="divergence-card__gap">
                        {t('sentimentBoard.gap')} <b>{formatNumber(item.gap)}</b>
                      </span>
                    </div>
                    <DivergenceTrack points={points} />
                    {/* 落差只有在兩側同一時點時才有意義。後端已經擋掉時點差太多的組合，
                        這裡把時點寫出來，讓使用者知道這個比較是什麼時候的。 */}
                    {item.asOf && (
                      <p className="divergence-card__asOf">
                        {t('sentimentBoard.asOf')} {item.asOf}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {board.groups.map((group) => (
          <section key={group.key} className="sentiment-board__group">
            <h2 className="sentiment-board__sectionTitle">{t(`sentimentBoard.groups.${group.key}.title`)}</h2>
            {/* 說明用小字副標而非 i 圖示：副標是可被爬蟲讀到的正文，
                而且不需要 hover 或點擊，手機上尤其如此。 */}
            <p className="sentiment-board__sectionNote">{t(`sentimentBoard.groups.${group.key}.note`)}</p>
            <div className="sentiment-board__grid">
              {group.items.map((item) => (
                <IndicatorCard key={item.id} item={item} lang={lang} t={t} />
              ))}
            </div>
          </section>
        ))}

        {!isPro && (
          <aside className="sentiment-board__upsell">
            <p>{t('sentimentBoard.upsellCopy')}</p>
            <Link className="sentiment-board__upsellLink" to={`/${lang}/subscription`}>
              {t('sentimentBoard.upsellCta')}
            </Link>
          </aside>
        )}

        <p className="sentiment-board__generatedAt">
          {t('sentimentBoard.generatedAt')} {formatDateTime(board.generatedAt)}
        </p>
      </div>
    </PageContainer>
  );
};

/**
 * 全站唯一的量尺。
 *
 * 這是這頁能不能被「看懂」的關鍵：各指標的單位天差地遠（0~10、0~100、
 * 負二十萬到正二十萬、六百多萬戶），光看數字無法判斷高低，也無法互相比較。
 * 把有原生刻度的指標都映射到同一條軌道上，位置本身就是資訊。
 *
 * 沒有天然上下界的指標（例如垃圾債利差）不給 scale，寧可只顯示數字 ——
 * 硬湊一個刻度會讓使用者以為那是有意義的滿格。
 *
 * tone='sentiment' 用於恐懼到貪婪這種本身帶方向的刻度，軌道以漸層表達兩端；
 * 其餘一律中性填色，避免把「高」暗示成「好」。
 */
const Meter = ({ value, scale, tone = 'neutral', locked = false, caption }) => {
  if (!scale) return null;

  const span = scale.max - scale.min;
  const pct = locked || value === null || value === undefined || !span
    ? null
    : Math.min(100, Math.max(0, ((value - scale.min) / span) * 100));

  return (
    <div className={`meter meter--${tone}${locked ? ' meter--locked' : ''}`}>
      <div className="meter__track">
        {pct !== null && <span className="meter__marker" style={{ left: `${pct}%` }} />}
      </div>
      {caption
        // 百分位軌道一定要標示，否則卡片上寫 -7.3、點卻落在 32 的位置，反而誤導。
        // 標籤與數值放同一行，一句話同時解釋點位並給出數字。
        ? (
          <p className="meter__note">
            {caption}
            <b>{pct === null ? '—' : `${Math.round(value)}%`}</b>
          </p>
        )
        // 原生刻度自己就說明了一切，只標兩端，不再加字。
        : (
          <div className="meter__scale">
            <span>{scale.min}</span>
            <span>{scale.max}</span>
          </div>
        )}
    </div>
  );
};

/**
 * 兩個值畫在同一條軌道上，中間的色帶就是落差。
 *
 * 標籤與數值直接掛在各自的點上（值在上、名稱在下），不另外列在兩側 ——
 * 列在兩側時使用者得自己把「左邊那欄」對應到「軌道上某個點」，而軌道兩端
 * 又是 0 和 100，兩種左右關係打架。掛在點上就沒有這個對應成本。
 */
const DivergenceTrack = ({ points }) => {
  // 貼近兩端時把標籤往內收，否則會被卡片邊緣切掉。
  const anchor = (pct) => ({
    left: `${pct}%`,
    transform: pct < 14 ? 'translateX(-14%)' : (pct > 86 ? 'translateX(-86%)' : 'translateX(-50%)')
  });

  const [a, b] = points;

  return (
    <div className="divergence-track">
      <div className="divergence-track__row divergence-track__row--values">
        {points.map((p) => (
          <span key={p.key} className="divergence-track__value" style={anchor(p.pct)}>
            {formatNumber(p.value)}
          </span>
        ))}
      </div>

      <div className="divergence-track__rail">
        <span
          className="divergence-track__band"
          style={{ left: `${Math.min(a.pct, b.pct)}%`, width: `${Math.abs(a.pct - b.pct)}%` }}
        />
        {points.map((p, i) => (
          <span
            key={p.key}
            className={`divergence-track__dot divergence-track__dot--${i === 0 ? 'a' : 'b'}`}
            style={{ left: `${p.pct}%` }}
          />
        ))}
      </div>

      <div className="divergence-track__row divergence-track__row--labels">
        {points.map((p) => (
          <span key={p.key} className="divergence-track__label" style={anchor(p.pct)}>{p.label}</span>
        ))}
      </div>
    </div>
  );
};

const CompositeCard = ({ label, data, href, t }) => (
  <article className={`composite-card${data.delayed ? ' composite-card--delayed' : ''}`}>
    <p className="composite-card__label">{label}</p>
    <p className="composite-card__value">
      {data.locked ? <span className="composite-card__lock">{t('sentimentBoard.proOnly')}</span> : formatNumber(data.value)}
    </p>
    <Meter value={data.value} scale={data.scale} tone="sentiment" locked={data.locked} />
    {data.date && (
      <p className={`composite-card__date${data.delayed ? ' composite-card__date--delayed' : ''}`}>
        {data.delayed && <b>{t('sentimentBoard.delayedTag')}</b>}
        {data.date}
      </p>
    )}
    <Link className="composite-card__link" to={href}>{t('sentimentBoard.viewDetail')}</Link>
  </article>
);

const IndicatorCard = ({ item, lang, t }) => {
  const explainerSlug = EXPLAINER_BY_ITEM_ID[item.id];
  // 後端的 label 只當保底：新增指標時翻譯還沒補上，也不會變成空白卡片。
  const name = t(`sentimentBoard.indicatorNames.${item.id}`, { defaultValue: item.label });
  const percentile = item.derived?.percentileRank;
  const meter = item.scale
    ? { value: item.value, scale: item.scale, tone: 'sentiment' }
    : (percentile !== null && percentile !== undefined
      ? {
        value: percentile,
        scale: { min: 0, max: 100 },
        tone: 'neutral',
        caption: t('sentimentBoard.percentileCaption')
      }
      : null);

  return (
  <article className={`indicator-card${item.delayed ? ' indicator-card--delayed' : ''}`}>
    <div className="indicator-card__head">
      <h3 className="indicator-card__label">
        {explainerSlug
          ? <Link to={`/${lang}/sentiment-indicators/${explainerSlug}`}>{name}</Link>
          : name}
      </h3>
      {item.publisher && <span className="indicator-card__publisher">{item.publisher}</span>}
    </div>

    <p className="indicator-card__value">
      {item.locked
        ? <span className="indicator-card__lock">{t('sentimentBoard.proOnly')}</span>
        : (item.value === null ? <span className="indicator-card__empty">—</span> : formatNumber(item.value))}
    </p>

    {item.rating && !item.locked && <p className="indicator-card__rating">{item.rating}</p>}

    {/* 有原生刻度的（CNN 0~100、BofA 0~10）直接畫值；其餘指標沒有共同單位，
        改用歷史百分位當共同尺度。百分位是 SIO 算的，所以只有 Pro 看得到值，
        免費使用者看到的是空軌道加鎖 —— 讓「這裡有東西沒給你」是看得見的，
        但不假造任何數字。 */}
    {meter && <Meter {...meter} locked={item.locked} />}

    <footer className="indicator-card__foot">
      {/* 資料時間一律顯示 —— 讓過期是看得見的，而不是隱形的。
          延遲的卡片再加一個標籤，使用者不必回頭對照上方 banner 才知道哪張是舊的。 */}
      <span className={`indicator-card__date${item.delayed ? ' indicator-card__date--delayed' : ''}`}>
        {item.delayed && <b>{t('sentimentBoard.delayedTag')}</b>}
        {item.date || t('sentimentBoard.noData')}
      </span>
      {item.publisherUrl && (
        <a className="indicator-card__source" href={item.publisherUrl} target="_blank" rel="noopener noreferrer">
          {t('sentimentBoard.source')}
        </a>
      )}
    </footer>
  </article>
  );
};

/**
 * 側別標籤。後端只給 key，翻譯若缺就退回把 key 轉成可讀字串
 * （`institutional` → `Institutional`），絕不讓 `sentimentBoard.sides.xxx`
 * 這種原始 key 出現在畫面上。後端改了 key 而翻譯還沒跟上時，這是最後一道防線。
 */
function sideLabel(t, key) {
  const fallback = String(key || '')
    .split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  return t(`sentimentBoard.sides.${key}`, { defaultValue: fallback });
}

/**
 * 小數位數沿用全站的 getDecimalPlaces（見 utils/priceUtils），與圖表軸標籤、
 * 個股價格、/market-sentiment 的數值用同一套判準 —— 同一個指標在站內不同頁面
 * 不該有兩種長相。
 *
 * 與 formatPrice 唯一的差別是保留千分位：這頁有六百多萬的有交易戶數和
 * ±二十萬的期貨淨未平倉，沒有分位符號會讀不出量級。
 */
function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';

  const num = Number(value);
  return num.toLocaleString(undefined, { maximumFractionDigits: getDecimalPlaces(num) });
}

function formatDateTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
}

export default SentimentBoard;
