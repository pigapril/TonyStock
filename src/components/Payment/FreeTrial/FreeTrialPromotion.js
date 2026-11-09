import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../Auth/useAuth';
import { useSubscription } from '../../Subscription/SubscriptionContext';
import { Dialog } from '../../Common/Dialog/Dialog';
import { claimFreeTrialPromotion } from '../../../services/freeTrialService';
import { trackProductEvent } from '../../../utils/productAnalytics';
import { getAnalysisReturnPath, withAnalysisReturnPath } from '../../../utils/trialNavigation';
import './FreeTrialPromotion.css';

const PROMOTION_DELAY_MS = 3000;
const excludedPage = (pathname) => /\/(subscription-plans|user-account|payment|admin)(\/|$)/.test(pathname);
const noop = () => {};
const allowAcquire = () => true;

export default function FreeTrialPromotion({
  request = null, adOpen = false, adCooldownActive = false,
  otherDialogOpen = false, onRequestConsumed = noop, onAcquire = allowAcquire, onRelease = noop
}) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { userPlan } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const isLocalPreview = process.env.NODE_ENV === 'development'
    && new URLSearchParams(location.search).get('previewFreeTrial') === '1';
  const handledRequests = useRef(new Set());
  const hasPromotionLock = useRef(false);
  const checkedAccounts = useRef(new Set());
  const inFlightAccounts = useRef(new Set());
  const [open, setOpen] = useState(false);
  const [previewDismissed, setPreviewDismissed] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [activePromotion, setActivePromotion] = useState(null);
  const userId = user?.id || user?.userId;
  const isFree = user?.plan === 'free' && userPlan?.type === 'free';
  const isVisible = (open && isFree) || (isLocalPreview && !previewDismissed);
  const releasePromotionLock = useCallback(() => {
    if (!hasPromotionLock.current) return;
    hasPromotionLock.current = false;
    onRelease();
  }, [onRelease]);

  useEffect(() => {
    if (!isFree) {
      setOpen(false);
      setPendingPromotion(null);
      setActivePromotion(null);
      releasePromotionLock();
    }
  }, [isFree, releasePromotionLock]);

  useEffect(() => () => releasePromotionLock(), [releasePromotionLock]);

  useEffect(() => {
    const requestId = request?.id;
    if (!requestId || isLocalPreview || handledRequests.current.has(requestId)) return undefined;
    const requestUserId = request.userId;
    const requestPathname = request.pathname;
    const triggerSource = request.triggerSource;
    const consume = () => {
      handledRequests.current.add(requestId);
      onRequestConsumed(requestId);
    };

    if (requestUserId !== userId || requestPathname !== location.pathname
      || !userId || !isFree || excludedPage(location.pathname)) {
      consume();
      return undefined;
    }
    if (adOpen || adCooldownActive || otherDialogOpen) return undefined;
    if (checkedAccounts.current.has(userId) || inFlightAccounts.current.has(userId)) {
      consume();
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      if (handledRequests.current.has(requestId)) return;
      consume();
      if (checkedAccounts.current.has(userId) || inFlightAccounts.current.has(userId)) return;
      inFlightAccounts.current.add(userId);
      try {
        const result = await claimFreeTrialPromotion();
        checkedAccounts.current.add(userId);
        if (result?.show && location.pathname === requestPathname) {
          setPendingPromotion({ userId, pathname: requestPathname, triggerSource });
        }
      } catch {
        // Failed checks are not cached; a later deliberate action may retry.
      } finally {
        inFlightAccounts.current.delete(userId);
      }
    }, PROMOTION_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    request?.id, request?.userId, request?.pathname, request?.triggerSource,
    isLocalPreview, userId, isFree, adOpen, adCooldownActive, otherDialogOpen,
    location.pathname, onRequestConsumed
  ]);

  useEffect(() => {
    if (!pendingPromotion) return;
    if (pendingPromotion.userId !== userId || pendingPromotion.pathname !== location.pathname
      || !isFree || excludedPage(location.pathname)) {
      setPendingPromotion(null);
      return;
    }
    if (adOpen || adCooldownActive || otherDialogOpen) return;
    if (!onAcquire()) return;
    hasPromotionLock.current = true;

    setPendingPromotion(null);
    setActivePromotion({ placement: 'interstitial', triggerSource: pendingPromotion.triggerSource });
    setOpen(true);
    trackProductEvent('free_trial_promotion_viewed', {
      trial_days: 30, placement: 'interstitial', trigger_source: pendingPromotion.triggerSource
    });
  }, [pendingPromotion, userId, isFree, adOpen, adCooldownActive, otherDialogOpen, location.pathname, onAcquire]);

  const close = () => {
    setOpen(false);
    setPreviewDismissed(true);
    setPendingPromotion(null);
    releasePromotionLock();
    if (!isLocalPreview && activePromotion) {
      trackProductEvent('free_trial_promotion_dismissed', {
        trial_days: 30,
        placement: activePromotion.placement,
        trigger_source: activePromotion.triggerSource
      });
    }
    setActivePromotion(null);
  };

  const startTrial = () => {
    setOpen(false);
    setPendingPromotion(null);
    releasePromotionLock();
    if (!isLocalPreview) {
      trackProductEvent('free_trial_promotion_clicked', {
        trial_days: 30,
        placement: activePromotion?.placement || 'interstitial',
        trigger_source: activePromotion?.triggerSource || null
      });
    }
    setActivePromotion(null);
    const lang = location.pathname.split('/')[1] || i18n.language || 'zh-TW';
    navigate(withAnalysisReturnPath(`/${lang}/payment/free-trial`, getAnalysisReturnPath(location.search, lang)));
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
        <button type="button" className="free-trial-promotion__cta" onClick={startTrial}>
          {t('freeTrial.promotion.cta')}
        </button>
        <button type="button" className="free-trial-promotion__later" onClick={close}>
          {t('freeTrial.promotion.later')}
        </button>
      </div>
    </Dialog>
  );
}
