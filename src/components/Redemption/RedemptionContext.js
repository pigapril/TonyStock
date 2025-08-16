import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../Auth/useAuth';
import redemptionService from '../../services/redemptionService';
import { systemLogger } from '../../utils/logger';
import { Analytics } from '../../utils/analytics';

const RedemptionContext = createContext({
  // State
  activePromotions: null,
  redemptionHistory: null,
  loading: false,
  error: null,
  
  // Current redemption flow state
  currentRedemption: null,
  redemptionStep: 'input', // 'input' | 'preview' | 'confirming' | 'processing' | 'success' | 'error'
  
  // Actions
  previewCode: () => {},
  redeemCode: () => {},
  cancelRedemption: () => {},
  refreshActivePromotions: () => {},
  refreshRedemptionHistory: () => {},
  clearRedemptionState: () => {},
  
  // Cache management
  clearCache: () => {},
  getCacheStats: () => {}
});

export const useRedemption = () => {
  const context = useContext(RedemptionContext);
  if (!context) {
    throw new Error('useRedemption must be used within a RedemptionProvider');
  }
  return context;
};

export const RedemptionProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Core state
  const [activePromotions, setActivePromotions] = useState(null);
  const [redemptionHistory, setRedemptionHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Current redemption flow state
  const [currentRedemption, setCurrentRedemption] = useState(null);
  const [redemptionStep, setRedemptionStep] = useState('input');
  
  // Auto-refresh intervals
  const [refreshInterval, setRefreshInterval] = useState(null);

  /**
   * Clear all redemption state
   */
  const clearRedemptionState = useCallback(() => {
    setCurrentRedemption(null);
    setRedemptionStep('input');
    setError(null);
    systemLogger.info('Redemption state cleared');
  }, []);

  /**
   * Preview a redemption code
   */
  const previewCode = useCallback(async (code) => {
    if (!code?.trim()) {
      setError('Please enter a redemption code');
      return { success: false, error: 'Please enter a redemption code' };
    }

    try {
      setLoading(true);
      setError(null);
      setRedemptionStep('preview');
      
      systemLogger.info('Previewing redemption code', { 
        code: code.substring(0, 4) + '***',
        userId: user?.id 
      });

      const result = await redemptionService.previewRedemption(code);
      
      if (result.success) {
        setCurrentRedemption({
          code: code.trim().toUpperCase(),
          preview: result.data,
          timestamp: Date.now()
        });
        
        Analytics.track('redemption_code_previewed', {
          userId: user?.id,
          codeType: result.data?.codeType,
          benefitType: result.data?.benefits?.type
        });
        
        return result;
      } else {
        setError(result.error);
        setRedemptionStep('error');
        
        Analytics.track('redemption_preview_failed', {
          userId: user?.id,
          errorCode: result.errorCode,
          error: result.error
        });
        
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to preview redemption code';
      setError(errorMessage);
      setRedemptionStep('error');
      
      systemLogger.error('Preview redemption failed:', {
        error: errorMessage,
        code: code?.substring(0, 4) + '***',
        userId: user?.id
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Redeem a code with confirmation
   */
  const redeemCode = useCallback(async (code, confirmed = false) => {
    if (!code?.trim()) {
      setError('Please enter a redemption code');
      return { success: false, error: 'Please enter a redemption code' };
    }

    try {
      setLoading(true);
      setError(null);
      setRedemptionStep(confirmed ? 'processing' : 'confirming');
      
      systemLogger.info('Redeeming code', { 
        code: code.substring(0, 4) + '***',
        confirmed,
        userId: user?.id 
      });

      const result = await redemptionService.redeemCode(code, confirmed);
      
      if (result.success) {
        setCurrentRedemption({
          code: code.trim().toUpperCase(),
          result: result.data,
          timestamp: Date.now(),
          status: 'success'
        });
        setRedemptionStep('success');
        
        // Refresh data after successful redemption
        await Promise.all([
          refreshActivePromotions(true),
          refreshRedemptionHistory(true)
        ]);
        
        Analytics.track('redemption_code_redeemed', {
          userId: user?.id,
          codeType: result.data?.codeType,
          benefitType: result.data?.benefits?.type,
          discountAmount: result.data?.benefits?.discountAmount
        });
        
        return result;
      } else {
        setError(result.error);
        setRedemptionStep('error');
        
        // Handle confirmation requirement
        if (result.requiresConfirmation) {
          setRedemptionStep('confirming');
          setCurrentRedemption({
            code: code.trim().toUpperCase(),
            preview: result.details,
            requiresConfirmation: true,
            timestamp: Date.now()
          });
        }
        
        Analytics.track('redemption_failed', {
          userId: user?.id,
          errorCode: result.errorCode,
          error: result.error,
          requiresConfirmation: result.requiresConfirmation
        });
        
        return result;
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to redeem code';
      setError(errorMessage);
      setRedemptionStep('error');
      
      systemLogger.error('Redeem code failed:', {
        error: errorMessage,
        code: code?.substring(0, 4) + '***',
        confirmed,
        userId: user?.id
      });
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Cancel current redemption
   */
  const cancelRedemption = useCallback(() => {
    clearRedemptionState();
    
    Analytics.track('redemption_cancelled', {
      userId: user?.id,
      step: redemptionStep
    });
    
    systemLogger.info('Redemption cancelled by user', { 
      step: redemptionStep,
      userId: user?.id 
    });
  }, [clearRedemptionState, redemptionStep, user]);

  /**
   * Refresh active promotions
   */
  const refreshActivePromotions = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await redemptionService.getActivePromotions(forceRefresh);
      
      if (result.success) {
        setActivePromotions(result.data);
        
        Analytics.track('active_promotions_loaded', {
          userId: user.id,
          promotionCount: result.data?.length || 0,
          fromCache: result.fromCache
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to load active promotions';
      setError(errorMessage);
      
      systemLogger.error('Failed to refresh active promotions:', {
        error: errorMessage,
        userId: user?.id
      });
      
      Analytics.error({
        type: 'REDEMPTION_ERROR',
        code: error.code || 500,
        message: errorMessage,
        context: 'refreshActivePromotions'
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Refresh redemption history
   */
  const refreshRedemptionHistory = useCallback(async (forceRefresh = false, filters = {}) => {
    if (!isAuthenticated || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      const result = await redemptionService.getRedemptionHistory(filters, forceRefresh);
      
      if (result.success) {
        setRedemptionHistory(result.data);
        
        Analytics.track('redemption_history_loaded', {
          userId: user.id,
          historyCount: result.data?.items?.length || 0,
          fromCache: result.fromCache
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to load redemption history';
      setError(errorMessage);
      
      systemLogger.error('Failed to refresh redemption history:', {
        error: errorMessage,
        filters,
        userId: user?.id
      });
      
      Analytics.error({
        type: 'REDEMPTION_ERROR',
        code: error.code || 500,
        message: errorMessage,
        context: 'refreshRedemptionHistory'
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  /**
   * Clear redemption service cache
   */
  const clearCache = useCallback(() => {
    redemptionService.clearCache();
    systemLogger.info('Redemption cache cleared');
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return redemptionService.getCacheStats();
  }, []);

  // Load initial data when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      systemLogger.info('Loading initial redemption data', { userId: user.id });
      
      Promise.all([
        refreshActivePromotions(),
        refreshRedemptionHistory()
      ]).catch(error => {
        systemLogger.error('Failed to load initial redemption data:', error);
      });
    } else {
      // Clear data when user logs out
      setActivePromotions(null);
      setRedemptionHistory(null);
      clearRedemptionState();
      setError(null);
    }
  }, [isAuthenticated, user, refreshActivePromotions, refreshRedemptionHistory, clearRedemptionState]);

  // Set up auto-refresh for active promotions
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Refresh active promotions every 2 minutes
    const interval = setInterval(() => {
      refreshActivePromotions();
    }, 2 * 60 * 1000);

    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, user, refreshActivePromotions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const value = {
    // State
    activePromotions,
    redemptionHistory,
    loading,
    error,
    
    // Current redemption flow state
    currentRedemption,
    redemptionStep,
    
    // Actions
    previewCode,
    redeemCode,
    cancelRedemption,
    refreshActivePromotions,
    refreshRedemptionHistory,
    clearRedemptionState,
    
    // Cache management
    clearCache,
    getCacheStats
  };

  return (
    <RedemptionContext.Provider value={value}>
      {children}
    </RedemptionContext.Provider>
  );
};