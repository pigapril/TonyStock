import React from 'react';
import { RedemptionProvider } from './RedemptionContext';
import { SubscriptionProvider } from '../Subscription/SubscriptionContext';

/**
 * Combined provider that wraps both RedemptionProvider and SubscriptionProvider
 * This ensures proper integration between redemption and subscription systems
 */
export const RedemptionProviderWrapper = ({ children }) => {
  return (
    <RedemptionProvider>
      <SubscriptionProvider>
        {children}
      </SubscriptionProvider>
    </RedemptionProvider>
  );
};

/**
 * Hook to use both redemption and subscription contexts together
 */
export const useRedemptionWithSubscription = () => {
  // This will be imported and used by components that need both contexts
  const redemption = require('./RedemptionContext').useRedemption();
  const subscription = require('../Subscription/SubscriptionContext').useSubscription();
  
  return {
    redemption,
    subscription
  };
};

export default RedemptionProviderWrapper;