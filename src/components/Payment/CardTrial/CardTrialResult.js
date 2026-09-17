import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './CardTrial.css';

// 綠界 3D 完成後由後端 303 導回，結果直接寫在 query 上，這一頁不再查一次。
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

    const view = RESULT_VIEWS[searchParams.get('status')] || RESULT_VIEWS.pending;
    const language = lang || i18n.language;

    return (
        <div className="card-trial">
            <section className="card-trial__disclosure">
                <h1 className="card-trial__title">{t(`cardTrial.result.${view.title}`)}</h1>
                <p>{t(`cardTrial.result.${view.body}`)}</p>
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
