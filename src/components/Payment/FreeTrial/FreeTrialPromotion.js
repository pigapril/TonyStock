import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../../Subscription/SubscriptionContext';
import { Dialog } from '../../Common/Dialog/Dialog';
import { claimFreeTrialPromotion } from '../../../services/freeTrialService';
import { trackProductEvent } from '../../../utils/productAnalytics';
import './FreeTrialPromotion.css';

const excludedPage = (pathname) => /\/(subscription-plans|user-account|payment|admin)(\/|$)/.test(pathname);

export default function FreeTrialPromotion({ adOpen = false, onOpenChange = () => {} }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { userPlan } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const isLocalPreview = process.env.NODE_ENV === 'development'
    && new URLSearchParams(location.search).get('previewFreeTrial') === '1';
  const attemptedAccounts = useRef(new Set());
  const [open, setOpen] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [claimedAccount, setClaimedAccount] = useState(null);
  const userId = user?.id || user?.userId;
  const isFree = user?.plan === 'free' && userPlan?.type === 'free';
  const isVisible = (open && isFree) || (isLocalPreview && !previewDismissed);

  useEffect(() => {
    if (!isFree) {
      setOpen(false);
      setClaimedAccount(null);
    }
  }, [isFree]);

  useEffect(() => {
    onOpenChange(isVisible);
    return () => onOpenChange(false);
  }, [isVisible, onOpenChange]);

  useEffect(() => {
    if (isLocalPreview || !userId || !isFree || adOpen || excludedPage(location.pathname)
      || attemptedAccounts.current.has(userId)) return undefined;

    attemptedAccounts.current.add(userId);
    claimFreeTrialPromotion().then(({ show }) => {
      if (show) setClaimedAccount(userId);
    }).catch(() => {
      // A failed frequency check must not show the promotion repeatedly.
    });
    return undefined;
  }, [isLocalPreview, userId, isFree, adOpen, location.pathname]);

  useEffect(() => {
    if (isLocalPreview || claimedAccount !== userId || !isFree || adOpen || excludedPage(location.pathname)) return;
    setClaimedAccount(null);
    setOpen(true);
    trackProductEvent('free_trial_promotion_viewed', { trial_days: 30 });
  }, [isLocalPreview, claimedAccount, userId, isFree, adOpen, location.pathname]);

  const close = () => {
    setOpen(false);
    setPreviewDismissed(true);
    setClaimedAccount(null);
    if (!isLocalPreview) trackProductEvent('free_trial_promotion_dismissed', { trial_days: 30 });
  };

  const goToPlans = () => {
    setOpen(false);
    setClaimedAccount(null);
    if (!isLocalPreview) trackProductEvent('free_trial_promotion_clicked', { trial_days: 30 });
    const lang = location.pathname.split('/')[1] || i18n.language || 'zh-TW';
    navigate(`/${lang}/subscription-plans`);
  };

  return (
    <Dialog
      open={isVisible}
      onClose={close}
      title={(
        <>
          <span className="free-trial-promotion__eyebrow">{t('freeTrial.promotion.badge')}</span>
          <span>{t('freeTrial.promotion.title')}</span>
        </>
      )}
      description={t('freeTrial.promotion.description')}
      className="free-trial-promotion"
      maxWidth="lg"
    >
      <div className="free-trial-promotion__art" aria-hidden="true">
        <span className="free-trial-promotion__artOffer">{t('freeTrial.promotion.visualOffer')}</span>
      </div>
      <div className="free-trial-promotion__terms">
        <strong>{t('freeTrial.promotion.detail')}</strong>
      </div>
      <div className="free-trial-promotion__actions">
        <button type="button" className="free-trial-promotion__cta" onClick={goToPlans}>
          {t('freeTrial.promotion.cta')}
        </button>
        <button type="button" className="free-trial-promotion__later" onClick={close}>
          {t('freeTrial.promotion.later')}
        </button>
      </div>
    </Dialog>
  );
}
