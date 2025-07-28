import React, { useState } from 'react';
import { PlanInfo } from './PlanInfo';
import { SubscriptionProvider } from '../../context/SubscriptionContext';
import { AppleButton } from '../../shared/AppleButton';
import './PlanInfoDemo.css';

// Mock subscription context for demo purposes
const MockSubscriptionProvider = ({ children, mockPlan }) => {
  const mockContext = {
    userPlan: mockPlan,
    loading: false,
    usageStats: null,
    subscriptionHistory: null,
    error: null,
    refreshSubscriptionData: () => {},
    updatePlan: () => {}
  };

  return (
    <div className="mock-subscription-context">
      {React.cloneElement(children, { mockContext })}
    </div>
  );
};

export const PlanInfoDemo = () => {
  const [currentPlan, setCurrentPlan] = useState('free');

  const mockPlans = {
    free: {
      type: 'free',
      status: 'active',
      startDate: new Date('2024-01-01'),
      autoRenew: true
    },
    pro: {
      type: 'pro',
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2025-01-01'),
      autoRenew: true
    },
    ultra: {
      type: 'ultra',
      status: 'active',
      startDate: new Date('2024-01-01'),
      autoRenew: false
    }
  };

  return (
    <div className="plan-info-demo">
      <div className="plan-info-demo__header">
        <h1>PlanInfo Component Demo</h1>
        <p>Test the PlanInfo component with different plan types</p>
      </div>

      <div className="plan-info-demo__controls">
        <h3>Select Plan Type:</h3>
        <div className="plan-info-demo__buttons">
          {Object.keys(mockPlans).map((planType) => (
            <AppleButton
              key={planType}
              variant={currentPlan === planType ? 'primary' : 'secondary'}
              size="medium"
              onClick={() => setCurrentPlan(planType)}
              className="plan-info-demo__button"
            >
              {planType.charAt(0).toUpperCase() + planType.slice(1)}
            </AppleButton>
          ))}
        </div>
      </div>

      <div className="plan-info-demo__preview">
        <h3>Preview:</h3>
        <div className="plan-info-demo__component">
          <SubscriptionProvider>
            <div style={{ 
              '--mock-plan': JSON.stringify(mockPlans[currentPlan])
            }}>
              <PlanInfo />
            </div>
          </SubscriptionProvider>
        </div>
      </div>

      <div className="plan-info-demo__info">
        <h3>Current Mock Data:</h3>
        <pre className="plan-info-demo__json">
          {JSON.stringify(mockPlans[currentPlan], null, 2)}
        </pre>
      </div>
    </div>
  );
};