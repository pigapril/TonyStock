import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './CardTrial.css';
import { fetchCardTrialResult } from '../../../services/cardTrialService';

// query 只提供交易編號，成功與否必須由登入者該筆 binding 的後端終態確認。
const RESULT_VIEWS = {
    success: { title: 'successTitle', body: 'successBody', cta: 'successCta', to: 'watchlist' },
    failed: { title: 'failedTitle', body: 'failedBody', cta: 'retryCta', to: 'payment/card-trial' },
    pending: { title: 'pendingTitle', body: 'pendingBody', cta: 'accountCta', to: 'user-account' }
};

const CardTrialResult = () => {
    const { t, i18n } = useTranslation();
    const { lang } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const merchantTradeNo = searchParams.get('merchantTradeNo');
    const [result, setResult] = useState(null);
    useEffect(() => {
        let cancelled = false;
        let timer;
        let attempts = 0;
        const check = async () => {
            attempts += 1;
            try {
                const data = await fetchCardTrialResult(merchantTradeNo);
                if (cancelled) return;
                const status = data.status === 'succeeded' ? 'success' : data.status === 'failed' ? 'failed' : 'pending';
                setResult({ merchantTradeNo, status, failureReason: data.failureReason || null });
                if (status === 'pending' && attempts < 5) timer = setTimeout(check, 2000);
            } catch {
                if (!cancelled) setResult({ merchantTradeNo, status: 'pending' });
            }
        };
        setResult(null);
        if (merchantTradeNo) check();
        return () => { cancelled = true; clearTimeout(timer); };
    }, [merchantTradeNo]);

    const view = RESULT_VIEWS[result && result.merchantTradeNo === merchantTradeNo ? result.status : 'pending'];
    const language = lang || i18n.language;

    return (
        <div className="card-trial">
            <section className="card-trial__disclosure">
                <h1 className="card-trial__title">{t(`cardTrial.result.${view.title}`)}</h1>
                <p>{t(`cardTrial.result.${view.body}`)}</p>
                {view === RESULT_VIEWS.failed && result && result.failureReason && (
                    <p className="card-trial__failure-reason">
                        {t(`cardTrial.result.failureReasons.${result.failureReason}`)}
                    </p>
                )}
            </section>
            <button
                type="button"
                className="card-trial__primary"
                onClick={() => navigate(`/${language}/${view.to}`)}
            >
                {t(`cardTrial.result.${view.cta}`)}
            </button>
        </div>
    );
};

export default CardTrialResult;
