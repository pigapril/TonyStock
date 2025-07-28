import { lazy } from 'react';

// Lazy load subscription components for better performance
export const UserAccountPage = lazy(() => 
  import('./UserAccount/UserAccountPage').then(module => ({
    default: module.UserAccountPage
  }))
);

export const SubscriptionPlansPage = lazy(() => 
  import('./SubscriptionPlans/SubscriptionPlansPage').then(module => ({
    default: module.SubscriptionPlansPage
  }))
);

export const QuotaDialog = lazy(() => 
  import('./QuotaDialog/QuotaDialog').then(module => ({
    default: module.QuotaDialog
  }))
);

// Preload components for better UX
export const preloadSubscriptionComponents = () => {
  // Preload UserAccountPage when user is authenticated
  import('./UserAccount/UserAccountPage');
  
  // Preload SubscriptionPlansPage when quota is approaching limit
  import('./SubscriptionPlans/SubscriptionPlansPage');
  
  // Preload QuotaDialog when usage is above 80%
  import('./QuotaDialog/QuotaDialog');
};

// Component-specific lazy loading
export const PlanInfo = lazy(() => 
  import('./UserAccount/components/PlanInfo').then(module => ({
    default: module.PlanInfo
  }))
);

export const UsageStats = lazy(() => 
  import('./UserAccount/components/UsageStats').then(module => ({
    default: module.UsageStats
  }))
);

export const SubscriptionHistory = lazy(() => 
  import('./UserAccount/components/SubscriptionHistory').then(module => ({
    default: module.SubscriptionHistory
  }))
);

export const PlanComparison = lazy(() => 
  import('./SubscriptionPlans/components/PlanComparison').then(module => ({
    default: module.PlanComparison
  }))
);