import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { AppleButton } from '../../shared/AppleButton';
import { fetchPaymentMethod } from '../../../../services/cardUpdateService';
import './PaymentMethod.css';

const ANCHOR_ID = 'payment-method';

// production VM 是 Etc/UTC，不指定時區會差一天。
const taipeiDateText = (locale, date) => new Intl.DateTimeFormat(
    locale === 'en' ? 'en-US' : 'zh-TW',
    { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' }
).format(new Date(date));

// zh-TW 的句子自帶「元」、不加千分位；en 的句子自帶 NT$。
const amountText = (locale, amount) => (
    locale === 'en' ? new Intl.NumberFormat('en-US').format(amount) : String(amount)
);

// 回呼沒帶 CardInfo 時末四碼與有效年月會是 null，缺哪個就不顯示哪個，全缺就沒有這一行。
const cardLineOf = (t, { cardLast4, cardValidMM, cardValidYY }) => {
    const validity = cardValidMM && cardValidYY ? { mm: String(cardValidMM).padStart(2, '0'), yy: String(cardValidYY).padStart(2, '0') } : null;
    if (cardLast4 && validity) return t('cardUpdate.method.card', { last4: cardLast4, ...validity });
    if (cardLast4) return t('cardUpdate.method.cardWithoutValidity', { last4: cardLast4 });
    if (validity) return t('cardUpdate.method.cardWithoutLast4', validity);
    return null;
};

// 只服務綁卡軌。定期定額訂戶的卡在綠界那一端，我們換不了，所以連 API 都不打、也不輸出任何 DOM。
export const PaymentMethod = ({ plan }) => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { lang } = useParams();
    const [method, setMethod] = useState(null);

    const isBoundCard = plan?.billingRail === 'bound_card';
    const language = lang || i18n.language;
    const locale = String(language || '').startsWith('en') ? 'en' : 'zh-TW';

    useEffect(() => {
        if (!isBoundCard) return undefined;
        let abandoned = false;
        fetchPaymentMethod()
            .then((data) => {
                if (!abandoned) setMethod(data);
            })
            .catch(() => {
                if (!abandoned) setMethod(null);
            });
        return () => { abandoned = true; };
    }, [isBoundCard]);

    // 扣款失敗信連到 #payment-method，但這個區塊要等 API 回來才出現，瀏覽器載入時的錨點捲動會落空。
    useEffect(() => {
        if (method && window.location.hash === `#${ANCHOR_ID}`) {
            document.getElementById(ANCHOR_ID).scrollIntoView();
        }
    }, [method]);

    if (!isBoundCard || !method) return null;

    const cardLine = cardLineOf(t, method);

    return (
        <section id={ANCHOR_ID} className="user-account-section ui-surface-card payment-method">
            <h2 className="user-account-section__title">{t('cardUpdate.method.title')}</h2>

            {/* 上一筆扣款還在向綠界確認：這時換卡不會被扣款，確認失敗後又會要求換卡，所以先不給按鈕。 */}
            {method.chargePending && (
                <p className="payment-method__notice">{t('cardUpdate.errors.chargePending')}</p>
            )}

            {method.inGrace && !method.chargePending && (
                <p className="payment-method__notice">
                    {t('cardUpdate.method.graceNotice', { date: taipeiDateText(locale, method.graceUntil) })}
                </p>
            )}

            {cardLine && <p className="payment-method__card">{cardLine}</p>}

            {!method.chargePending && (
                <AppleButton variant="primary" onClick={() => navigate(`/${language}/payment/card-update`)}>
                    {method.inGrace
                        ? t('cardUpdate.method.updateAndPay', { amount: amountText(locale, method.amountDue) })
                        : t('cardUpdate.method.update')}
                </AppleButton>
            )}
        </section>
    );
};
