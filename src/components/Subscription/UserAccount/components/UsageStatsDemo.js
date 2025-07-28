import React, { useState } from 'react';
import { UsageStats } from './UsageStats';
import { SubscriptionProvider } from '../../context/SubscriptionContext';
import { AppleButton } from '../../shared/AppleButton';
import './UsageStatsDemo.css';

export const UsageStatsDemo = () => {
  const [scenario, setScenario] = useState('normal');

  const mockScenarios = {
    normal: {
      daily: {
        api: { used: 150, limit: 1000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 3, limit: 10, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        news: { used: 12, limit: 50, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        search: { used: 25, limit: 100, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      },
      monthly: {
        api: { used: 3500, limit: 20000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 45, limit: 200, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        news: { used: 280, limit: 1000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        search: { used: 650, limit: 2000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }
    },
    nearLimit: {
      daily: {
        api: { used: 850, limit: 1000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 9, limit: 10, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        news: { used: 45, limit: 50, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        search: { used: 85, limit: 100, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      },
      monthly: {
        api: { used: 18000, limit: 20000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 180, limit: 200, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        news: { used: 900, limit: 1000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        search: { used: 1800, limit: 2000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }
    },
    exceeded: {
      daily: {
        api: { used: 1200, limit: 1000, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 12, limit: 10, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        news: { used: 55, limit: 50, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        search: { used: 110, limit: 100, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      },
      monthly: {
        api: { used: 22000, limit: 20000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 220, limit: 200, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        news: { used: 1100, limit: 1000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        search: { used: 2200, limit: 2000, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }
    },
    unlimited: {
      daily: {
        api: { used: 5000, limit: -1, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 50, limit: -1, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        news: { used: 200, limit: -1, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        search: { used: 300, limit: -1, resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) }
      },
      monthly: {
        api: { used: 150000, limit: -1, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        priceAnalysis: { used: 1500, limit: -1, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        news: { used: 6000, limit: -1, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        search: { used: 9000, limit: -1, resetTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
      }
    }
  };

  // Mock subscription context
  const MockSubscriptionContext = React.createContext({
    usageStats: mockScenarios[scenario],
    loading: false
  });

  const MockSubscriptionProvider = ({ children }) => {
    return (
      <MockSubscriptionContext.Provider value={{
        usageStats: mockScenarios[scenario],
        loading: false
      }}>
        {children}
      </MockSubscriptionContext.Provider>
    );
  };

  // Override the useSubscription hook for demo
  const originalUseSubscription = require('../../context/SubscriptionContext').useSubscription;
  React.useEffect(() => {
    require('../../context/SubscriptionContext').useSubscription = () => ({
      usageStats: mockScenarios[scenario],
      loading: false
    });
    
    return () => {
      require('../../context/SubscriptionContext').useSubscription = originalUseSubscription;
    };
  }, [scenario, originalUseSubscription]);

  return (
    <div className="usage-stats-demo">
      <div className="usage-stats-demo__header">
        <h1>UsageStats Component Demo</h1>
        <p>Test the UsageStats component with different usage scenarios</p>
      </div>

      <div className="usage-stats-demo__controls">
        <h3>Select Usage Scenario:</h3>
        <div className="usage-stats-demo__buttons">
          {Object.keys(mockScenarios).map((scenarioKey) => (
            <AppleButton
              key={scenarioKey}
              variant={scenario === scenarioKey ? 'primary' : 'secondary'}
              size="medium"
              onClick={() => setScenario(scenarioKey)}
              className="usage-stats-demo__button"
            >
              {scenarioKey.charAt(0).toUpperCase() + scenarioKey.slice(1).replace(/([A-Z])/g, ' $1')}
            </AppleButton>
          ))}
        </div>
      </div>

      <div className="usage-stats-demo__preview">
        <h3>Preview:</h3>
        <div className="usage-stats-demo__component">
          <MockSubscriptionProvider>
            <UsageStats />
          </MockSubscriptionProvider>
        </div>
      </div>

      <div className="usage-stats-demo__info">
        <h3>Current Mock Data:</h3>
        <div className="usage-stats-demo__json-container">
          <h4>Daily Usage:</h4>
          <pre className="usage-stats-demo__json">
            {JSON.stringify(mockScenarios[scenario].daily, null, 2)}
          </pre>
          <h4>Monthly Usage:</h4>
          <pre className="usage-stats-demo__json">
            {JSON.stringify(mockScenarios[scenario].monthly, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};