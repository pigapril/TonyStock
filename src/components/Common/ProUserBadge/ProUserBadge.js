import React from 'react';
import { useSubscription } from '../../Subscription/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import './ProUserBadge.css';

/**
 * Pro 用戶徽章組件 - 顯示無廣告體驗提示
 */
export const ProUserBadge = ({ showAdFreeMessage = false }) => {
  const { userPlan } = useSubscription();
  const { t } = useTranslation();
  
  const isProUser = userPlan?.type === 'pro' || userPlan?.type === 'premium';
  
  if (!isProUser) {
    return null;
  }

  return (
    <div className="pro-user-badge">
      <div className="pro-badge-icon">👑</div>
      <div className="pro-badge-content">
        <span className="pro-badge-title">Pro 用戶</span>
        {showAdFreeMessage && (
          <span className="pro-badge-subtitle">享受無廣告體驗</span>
        )}
      </div>
    </div>
  );
};

export default ProUserBadge;