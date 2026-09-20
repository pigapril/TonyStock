import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startCardTrial, createBindCard } from '../../../services/cardTrialService';
import { BIND_CARD_CONTAINER_ID } from '../../../utils/ecpayBindCardSdk';
import { BINDING_PHASE, localeOf, useCardBinding } from './useCardBinding';
import './CardTrial.css';

// 送到後端落地的版本號，消保法舉證用。文案改動要一起改這個字串。
export const CARD_TRIAL_TERMS_VERSION = 'card-trial-v2';

const TRIAL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// 揭露日期要在按下同意那一刻仍正確。每秒重算，跨台北午夜時頁面與後端的差距不超過一秒。
const TICK_MS = 1000;
// 台北固定 UTC+8，沒有日光節約，偏移量可以寫死。
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

const CARD_TRIAL_BINDING = {
    start: startCardTrial,
    create: createBindCard,
    errorKeys: {
        CARD_TRIAL_ALREADY_SUBSCRIBED: 'cardTrial.errors.alreadySubscribed',
        CARD_TRIAL_PREVIOUS_SUBSCRIBER: 'cardTrial.errors.notEligible'
    },
    logMessage: 'Card trial binding failed:',
    pendingResultUrl: ({ locale, merchantTradeNo }) => `/${locale}/payment/card-trial/result?status=pending&merchantTradeNo=${encodeURIComponent(merchantTradeNo)}`
};

const RETRYABLE_ERROR_KEYS = new Set([
    'cardTrial.errors.expired',
    'cardTrial.errors.rateLimited',
    'cardTrial.errors.sdk',
    'cardTrial.errors.generic'
]);

// 網址上的 period 是使用者可以亂改的輸入，年繳以外一律當月繳。
const billingPeriodOf = (period) => (period === 'yearly' ? 'yearly' : 'monthly');

// 與後端 boundCardTrial.service.js 的 trialEndAt 同一條規則：滿 30 天之後的下一個
// 台北午夜，剛好是午夜就不進位。扣款 job 在那天 00:15 扣，確認信也寫這一天。
const trialEndAt = (now) => {
    const wallClock = now + TRIAL_DAYS * DAY_MS + TAIPEI_OFFSET_MS;
    const midnight = Math.floor(wallClock / DAY_MS) * DAY_MS;
    const aligned = midnight === wallClock ? midnight : midnight + DAY_MS;
    return new Date(aligned - TAIPEI_OFFSET_MS);
};

// production VM 是 Etc/UTC，不指定時區會差一天。
const renewalDateText = (locale, now) => new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'zh-TW',
    { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' }
).format(trialEndAt(now));

const CardTrialFlow = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { lang } = useParams();
    const [searchParams] = useSearchParams();
    const [now, setNow] = useState(Date.now);

    const language = lang || i18n.language;
    const locale = localeOf(language);
    const billingPeriod = billingPeriodOf(searchParams.get('period'));
    const renewalDate = renewalDateText(locale, now);
    const {
        phase,
        agreed,
        setAgreed,
        errorKey,
        showsCardFields,
        handleStart,
        handleSubmit,
        handleRestart
    } = useCardBinding(CARD_TRIAL_BINDING, locale);

    // 使用者可能停在這頁跨過台北午夜，揭露的扣款日要跟按下同意那一刻的日期一致。
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="card-trial">
            <h1 className="card-trial__title">{t('cardTrial.title')}</h1>

            {phase === BINDING_PHASE.terms && (
                <>
                    <section className="card-trial__disclosure">
                        <h2>{t('cardTrial.disclosureTitle')}</h2>
                        <ul>
                            <li>{t('cardTrial.disclosure.length')}</li>
                            <li>{t('cardTrial.disclosure.verification')}</li>
                            <li>
                                {t(
                                    billingPeriod === 'yearly' ? 'cardTrial.disclosure.renewalYearly' : 'cardTrial.disclosure.renewal',
                                    { date: renewalDate }
                                )}
                            </li>
                            <li>{t('cardTrial.disclosure.cancel')}</li>
                        </ul>
                    </section>

                    <label className="card-trial__consent">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(event) => setAgreed(event.target.checked)}
                        />
                        <span>
                            {t('cardTrial.consent')}
                            <a href={`/${language}/legal`} target="_blank" rel="noreferrer">
                                {t('cardTrial.consentLink')}
                            </a>
                        </span>
                    </label>

                    <button
                        type="button"
                        className="card-trial__primary"
                        onClick={() => handleStart({ termsVersion: CARD_TRIAL_TERMS_VERSION, locale, billingPeriod })}
                        disabled={!agreed}
                    >
                        {t('cardTrial.start')}
                    </button>
                </>
            )}

            {showsCardFields && (
                <section className="card-trial__card">
                    <h2>{t('cardTrial.cardTitle')}</h2>
                    {phase === BINDING_PHASE.starting && <p className="card-trial__status">{t('cardTrial.preparing')}</p>}
                    <div id={BIND_CARD_CONTAINER_ID} />
                    <p className="card-trial__note">{t('cardTrial.cardNote')}</p>
                    <button
                        type="button"
                        className="card-trial__primary"
                        onClick={handleSubmit}
                        disabled={phase !== BINDING_PHASE.binding}
                    >
                        {phase === BINDING_PHASE.submitting ? t('cardTrial.submitting') : t('cardTrial.submit')}
                    </button>
                </section>
            )}

            {phase === BINDING_PHASE.failed && (
                <section className="card-trial__error" role="alert">
                    <p>{t(errorKey)}</p>
                    {RETRYABLE_ERROR_KEYS.has(errorKey) ? (
                        <button type="button" className="card-trial__primary" onClick={handleRestart}>
                            {t('cardTrial.retry')}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="card-trial__primary"
                            onClick={() => navigate('/' + (lang || i18n.language) + '/subscription-plans')}
                        >
                            {t('cardTrial.goToSubscription')}
                        </button>
                    )}
                </section>
            )}
        </div>
    );
};

export default CardTrialFlow;
