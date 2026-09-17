import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../CardTrial/CardTrial.css';

const RESULT_VIEWS = {
    updated: { title: 'cardUpdate.result.successTitle', body: 'cardUpdate.result.successBody' },
    charging: { title: 'cardUpdate.result.successTitle', body: 'cardUpdate.result.chargingBody' },
    failed: { title: 'cardUpdate.result.failedTitle', body: 'cardUpdate.result.failedBody' },
    pending: { title: 'cardTrial.result.pendingTitle', body: 'cardTrial.result.pendingBody' }
};

// 綠界 3D 完成後由後端導回，結果直接寫在 query 上，這一頁不再查一次。
// 對不上任何一種組合的都當成還在確認。
const viewOf = (searchParams) => {
    const status = searchParams.get('status');
    const charging = searchParams.get('charging');
    if (status === 'failed') return RESULT_VIEWS.failed;
    if (status === 'success' && charging === '1') return RESULT_VIEWS.charging;
    if (status === 'success' && charging === '0') return RESULT_VIEWS.updated;
    return RESULT_VIEWS.pending;
};

const CardUpdateResult = () => {
    const { t, i18n } = useTranslation();
    const { lang } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const view = viewOf(searchParams);
    const language = lang || i18n.language;

    return (
        <div className="card-trial">
            <section className="card-trial__disclosure">
                <h1 className="card-trial__title">{t(view.title)}</h1>
                <p>{t(view.body)}</p>
            </section>
            <button
                type="button"
                className="card-trial__primary"
                onClick={() => navigate(`/${language}/user-account#payment-method`)}
            >
                {t('cardTrial.result.accountCta')}
            </button>
        </div>
    );
};

export default CardUpdateResult;
