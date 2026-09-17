import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createCardUpdateBind, fetchPaymentMethod, startCardUpdate } from '../../../services/cardUpdateService';
import { BIND_CARD_CONTAINER_ID } from '../../../utils/ecpayBindCardSdk';
import { BINDING_PHASE, localeOf, useCardBinding } from '../CardTrial/useCardBinding';
import '../CardTrial/CardTrial.css';

// 送到後端落地的版本號，消保法舉證用。文案改動要一起改這個字串。
export const CARD_UPDATE_TERMS_VERSION = 'card-update-v1';

const STATE_CHANGED_ERROR_KEY = 'cardUpdate.errors.stateChanged';
const CHARGE_PENDING_KEY = 'cardUpdate.errors.chargePending';

const CARD_UPDATE_BINDING = {
    start: startCardUpdate,
    create: createCardUpdateBind,
    errorKeys: {
        CARD_UPDATE_NOT_AVAILABLE: 'cardUpdate.errors.notAvailable',
        CARD_UPDATE_STATE_CHANGED: STATE_CHANGED_ERROR_KEY,
        CARD_UPDATE_CHARGE_PENDING: CHARGE_PENDING_KEY
    },
    logMessage: 'Card update binding failed:',
    pendingResultUrl: ({ locale, disclosedGrace }) => (
        `/${locale}/payment/card-update/result?status=pending&charging=${disclosedGrace ? 1 : 0}`
    )
};

const METHOD_LOADING = { status: 'loading' };

// production VM 是 Etc/UTC，不指定時區會差一天。
const taipeiDateText = (locale, date) => new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'zh-TW',
    { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' }
).format(new Date(date));

// zh-TW 的句子自帶「元」、不加千分位；en 的句子自帶 NT$。
const amountText = (locale, amount) => (
    locale === 'en' ? new Intl.NumberFormat('en-US').format(amount) : String(amount)
);

const CardUpdateFlow = () => {
    const { t, i18n } = useTranslation();
    const { lang } = useParams();
    const [load, setLoad] = useState(METHOD_LOADING);

    const language = lang || i18n.language;
    const locale = localeOf(language);
    // 後端拿這個值比對當下是否在寬限期，對不上回 409。畫面上的扣款揭露也只看它，兩邊不會分岔。
    const disclosedGrace = Boolean(load.method && load.method.inGrace);
    const {
        phase,
        agreed,
        setAgreed,
        errorKey,
        showsCardFields,
        handleStart,
        handleSubmit,
        handleRestart
    } = useCardBinding(CARD_UPDATE_BINDING, locale, { disclosedGrace });

    // 寬限期要多揭露立即扣款的金額與日期。查不到付款方式時不能退回平常版本，
    // 否則寬限期的人會在沒看到扣款揭露的情況下被扣款。
    useEffect(() => {
        let abandoned = false;
        fetchPaymentMethod()
            .then((method) => {
                if (abandoned) return;
                setLoad(method
                    ? { status: 'ready', method }
                    : { status: 'unavailable', errorKey: 'cardUpdate.errors.notAvailable' });
            })
            .catch(() => {
                if (!abandoned) setLoad({ status: 'unavailable', errorKey: 'cardTrial.errors.generic' });
            });
        return () => { abandoned = true; };
    }, []);

    if (load.status !== 'ready') {
        return (
            <div className="card-trial">
                <h1 className="card-trial__title">{t('cardUpdate.title')}</h1>
                {load.status === 'loading'
                    ? <p className="card-trial__status">{t('cardTrial.preparing')}</p>
                    : (
                        <section className="card-trial__error" role="alert">
                            <p>{t(load.errorKey)}</p>
                        </section>
                    )}
            </div>
        );
    }

    const { method } = load;
    const amount = amountText(locale, method.amountDue);

    // 上一筆扣款還在向綠界確認：這時換卡不會被扣款，確認失敗後又會要求換卡，所以先不給表單。
    if (method.chargePending) {
        return (
            <div className="card-trial">
                <h1 className="card-trial__title">{t('cardUpdate.title')}</h1>
                <section className="card-trial__error" role="alert">
                    <p>{t(CHARGE_PENDING_KEY)}</p>
                </section>
            </div>
        );
    }

    return (
        <div className="card-trial">
            <h1 className="card-trial__title">{t('cardUpdate.title')}</h1>

            {phase === BINDING_PHASE.terms && (
                <>
                    <section className="card-trial__disclosure">
                        <ul>
                            <li>{t('cardUpdate.disclosure.verification')}</li>
                            <li>{t('cardUpdate.disclosure.futureCharges')}</li>
                            {disclosedGrace && <li>{t('cardUpdate.disclosure.chargeNow', { amount })}</li>}
                            {disclosedGrace && (
                                <li>{t('cardUpdate.disclosure.nextCharge', { date: taipeiDateText(locale, method.nextChargeAt) })}</li>
                            )}
                        </ul>
                    </section>

                    <label className="card-trial__consent">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(event) => setAgreed(event.target.checked)}
                        />
                        <span>
                            {t('cardUpdate.consent')}
                            <a href={`/${language}/legal`} target="_blank" rel="noreferrer">
                                {t('cardUpdate.consentLink')}
                            </a>
                        </span>
                    </label>

                    <button
                        type="button"
                        className="card-trial__primary"
                        onClick={() => handleStart({ termsVersion: CARD_UPDATE_TERMS_VERSION, locale })}
                        disabled={!agreed}
                    >
                        {disclosedGrace ? t('cardUpdate.startAndPay', { amount }) : t('cardUpdate.start')}
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
                        {phase === BINDING_PHASE.submitting ? t('cardTrial.submitting') : t('cardUpdate.submit')}
                    </button>
                </section>
            )}

            {phase === BINDING_PHASE.failed && (
                <section className="card-trial__error" role="alert">
                    <p>{t(errorKey)}</p>
                    {/* 重新開始會沿用這頁載入時的揭露，付款狀態變了只能重新載入。 */}
                    {errorKey === STATE_CHANGED_ERROR_KEY || errorKey === CHARGE_PENDING_KEY ? (
                        <button type="button" className="card-trial__primary" onClick={() => window.location.reload()}>
                            {t('common.refresh')}
                        </button>
                    ) : (
                        <button type="button" className="card-trial__primary" onClick={handleRestart}>
                            {t('cardTrial.restart')}
                        </button>
                    )}
                </section>
            )}
        </div>
    );
};

export default CardUpdateFlow;
