import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../../Subscription/SubscriptionContext';
import { startFreeTrial } from '../../../services/freeTrialService';
import { trackProductEvent } from '../../../utils/productAnalytics';
import '../CardTrial/CardTrial.css';

const FreeTrialFlow = () => {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const { refreshUserPlan, refreshSubscriptionHistory } = useSubscription();
  const [phase, setPhase] = useState('ready');
  const [error, setError] = useState(null);
  const language = lang || i18n.language;

  const handleStart = async () => {
    if (phase !== 'ready') return;
    setPhase('starting');
    setError(null);
    try {
      const result = await startFreeTrial();
      trackProductEvent('free_trial_started', { trial_days: 30, subscription_id: result.subscriptionId });
      setPhase('success');
      await Promise.allSettled([checkAuthStatus(), refreshUserPlan(), refreshSubscriptionHistory()]);
    } catch (requestError) {
      const status = requestError.response?.status;
      setError(status === 409 ? 'freeTrial.errors.notEligible' : 'freeTrial.errors.generic');
      setPhase('failed');
    }
  };

  return (
    <div className="card-trial">
      <h1 className="card-trial__title">{t('freeTrial.title')}</h1>
      {phase === 'success' ? (
        <section className="card-trial__disclosure" role="status">
          <h2>{t('freeTrial.successTitle')}</h2>
          <p>{t('freeTrial.successBody')}</p>
          <button type="button" className="card-trial__primary" onClick={() => navigate(`/${language}`)}>
            {t('freeTrial.successCta')}
          </button>
        </section>
      ) : (
        <>
          <section className="card-trial__disclosure">
            <h2>{t('freeTrial.disclosureTitle')}</h2>
            <ul>
              <li>{t('freeTrial.disclosure.length')}</li>
              <li>{t('freeTrial.disclosure.noCard')}</li>
              <li>{t('freeTrial.disclosure.expiry')}</li>
            </ul>
          </section>
          {error && <section className="card-trial__error" role="alert"><p>{t(error)}</p></section>}
          <button
            type="button"
            className="card-trial__primary"
            disabled={phase !== 'ready'}
            onClick={handleStart}
          >
            {phase === 'starting' ? t('freeTrial.starting') : t('freeTrial.start')}
          </button>
          {phase === 'failed' && (
            <button type="button" className="card-trial__primary" onClick={() => navigate(`/${language}/subscription-plans`)}>
              {t('freeTrial.goToSubscription')}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default FreeTrialFlow;
