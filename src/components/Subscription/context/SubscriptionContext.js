import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../Auth/useAuth';
import SubscriptionApiService from '../../../services/subscriptionApi';
import subscriptionCache from '../../../services/subscriptionCache';
import { preloadSubscriptionComponents } from '../lazy';

// Action types
const SUBSCRIPTION_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_USER_PLAN: 'SET_USER_PLAN',
  SET_USAGE_STATS: 'SET_USAGE_STATS',
  SET_SUBSCRIPTION_HISTORY: 'SET_SUBSCRIPTION_HISTORY',
  UPDATE_USAGE: 'UPDATE_USAGE',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial state
const initialState = {
  userPlan: null,
  usageStats: null,
  subscriptionHistory: null,
  loading: false,
  error: null
};

// Reducer
const subscriptionReducer = (state, action) => {
  switch (action.type) {
    case SUBSCRIPTION_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case SUBSCRIPTION_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case SUBSCRIPTION_ACTIONS.SET_USER_PLAN:
      return { ...state, userPlan: action.payload, loading: false };
    
    case SUBSCRIPTION_ACTIONS.SET_USAGE_STATS:
      return { ...state, usageStats: action.payload, loading: false };
    
    case SUBSCRIPTION_ACTIONS.SET_SUBSCRIPTION_HISTORY:
      return { ...state, subscriptionHistory: action.payload, loading: false };
    
    case SUBSCRIPTION_ACTIONS.UPDATE_USAGE:
      return {
        ...state,
        usageStats: state.usageStats ? {
          ...state.usageStats,
          ...action.payload
        } : action.payload
      };
    
    case SUBSCRIPTION_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    default:
      return state;
  }
};

// Create context
const SubscriptionContext = createContext();

// Provider component
export const SubscriptionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(subscriptionReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // API base URL - adjust based on your backend configuration
  const API_BASE = process.env.REACT_APP_API_BASE || '';

  // Helper function to make API calls
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include', // Include cookies for authentication
        ...options
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API call to ${endpoint} failed:`, error);
      throw error;
    }
  };

  // Fetch user plan information
  const fetchUserPlan = async () => {
    if (!isAuthenticated) return;
    
    try {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_LOADING, payload: true });
      
      try {
        // Try to fetch from API first
        const planData = await SubscriptionApiService.getUserPlan();
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USER_PLAN, payload: planData });
      } catch (apiError) {
        // Fallback to user's plan from auth context or default to 'free'
        console.warn('API call failed, using fallback data:', apiError.message);
        const planData = {
          type: user?.plan || 'free',
          startDate: new Date(),
          status: 'active',
          autoRenew: true
        };
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USER_PLAN, payload: planData });
      }
    } catch (error) {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Fetch usage statistics
  const fetchUsageStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_LOADING, payload: true });
      
      try {
        // Try to fetch from API first
        const usageData = await SubscriptionApiService.getUsageStats();
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USAGE_STATS, payload: usageData });
      } catch (apiError) {
        // Fallback to mock data if API is not available
        console.warn('Usage stats API call failed, using mock data:', apiError.message);
        const mockUsageStats = {
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
        };
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USAGE_STATS, payload: mockUsageStats });
      }
    } catch (error) {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Fetch subscription history
  const fetchSubscriptionHistory = async () => {
    if (!isAuthenticated) return;
    
    try {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_LOADING, payload: true });
      
      try {
        // Try to fetch from API first
        const historyData = await SubscriptionApiService.getSubscriptionHistory();
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_SUBSCRIPTION_HISTORY, payload: historyData });
      } catch (apiError) {
        // Fallback to mock data if API is not available
        console.warn('Subscription history API call failed, using mock data:', apiError.message);
        const mockHistory = [
          {
            id: '1',
            date: new Date('2024-01-01'),
            action: 'upgrade',
            fromPlan: 'free',
            toPlan: 'pro',
            status: 'completed'
          }
        ];
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_SUBSCRIPTION_HISTORY, payload: mockHistory });
      }
    } catch (error) {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Update user plan
  const updatePlan = async (newPlan) => {
    try {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_LOADING, payload: true });
      
      try {
        // Try to update via API first
        const updatedPlan = await SubscriptionApiService.updateUserPlan(newPlan);
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USER_PLAN, payload: updatedPlan });
      } catch (apiError) {
        // Fallback to mock implementation
        console.warn('Plan update API call failed, using mock implementation:', apiError.message);
        const updatedPlan = {
          type: newPlan,
          startDate: new Date(),
          status: 'active',
          autoRenew: true
        };
        
        dispatch({ type: SUBSCRIPTION_ACTIONS.SET_USER_PLAN, payload: updatedPlan });
      }
      
      // Refresh usage stats after plan change
      await fetchUsageStats();
    } catch (error) {
      dispatch({ type: SUBSCRIPTION_ACTIONS.SET_ERROR, payload: error.message });
    }
  };

  // Refresh all subscription data
  const refreshSubscriptionData = async () => {
    await Promise.all([
      fetchUserPlan(),
      fetchUsageStats(),
      fetchSubscriptionHistory()
    ]);
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: SUBSCRIPTION_ACTIONS.CLEAR_ERROR });
  };

  // Load initial data when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshSubscriptionData();
    }
  }, [isAuthenticated, user]);

  // Context value
  const value = {
    // State
    userPlan: state.userPlan,
    usageStats: state.usageStats,
    subscriptionHistory: state.subscriptionHistory,
    loading: state.loading,
    error: state.error,
    
    // Actions
    fetchUserPlan,
    fetchUsageStats,
    fetchSubscriptionHistory,
    updatePlan,
    refreshSubscriptionData,
    clearError
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

// Custom hook to use subscription context
export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};