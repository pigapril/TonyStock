/**
 * 前端認證修復測試工具
 * 用於測試認證狀態檢查是否正常工作
 */

import apiClient from '../api/apiClient';

export const testAuthFix = {
    /**
     * 測試認證狀態端點
     */
    async testAuthStatus() {
        console.log('🧪 Testing auth status endpoint...');
        
        try {
            const response = await apiClient.get('/api/auth/status', {
                params: {
                    _t: Date.now()
                }
            });
            
            console.log('✅ Auth status test successful:', {
                status: response.status,
                data: response.data
            });
            
            return {
                success: true,
                status: response.status,
                data: response.data
            };
            
        } catch (error) {
            console.error('❌ Auth status test failed:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            };
        }
    },

    /**
     * 測試多次連續請求
     */
    async testMultipleRequests(count = 5) {
        console.log(`🧪 Testing ${count} consecutive auth status requests...`);
        
        const results = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const startTime = Date.now();
                const response = await apiClient.get('/api/auth/status', {
                    params: {
                        _t: Date.now()
                    }
                });
                const endTime = Date.now();
                
                results.push({
                    request: i + 1,
                    success: true,
                    status: response.status,
                    responseTime: endTime - startTime,
                    data: response.data
                });
                
                console.log(`✅ Request ${i + 1}/${count}: ${response.status} (${endTime - startTime}ms)`);
                
            } catch (error) {
                results.push({
                    request: i + 1,
                    success: false,
                    error: error.message,
                    status: error.response?.status,
                    data: error.response?.data
                });
                
                console.error(`❌ Request ${i + 1}/${count}: ${error.message}`);
            }
            
            // 短暫延遲避免過快請求
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const successCount = results.filter(r => r.success).length;
        console.log(`🎉 Test completed: ${successCount}/${count} requests successful`);
        
        return results;
    },

    /**
     * 測試認證流程
     */
    async testAuthFlow() {
        console.log('🧪 Testing complete auth flow...');
        
        const results = {
            authStatus: null,
            csrfToken: null,
            errors: []
        };
        
        try {
            // 1. 測試認證狀態
            console.log('Step 1: Testing auth status...');
            const authResult = await this.testAuthStatus();
            results.authStatus = authResult;
            
            if (!authResult.success) {
                results.errors.push('Auth status check failed');
            }
            
            // 2. 如果用戶已認證，測試 CSRF token 獲取
            if (authResult.success && authResult.data?.data?.isAuthenticated) {
                console.log('Step 2: Testing CSRF token retrieval...');
                try {
                    const csrfResponse = await apiClient.get('/api/auth/csrf-token');
                    results.csrfToken = {
                        success: true,
                        status: csrfResponse.status,
                        data: csrfResponse.data
                    };
                    console.log('✅ CSRF token retrieved successfully');
                } catch (error) {
                    results.csrfToken = {
                        success: false,
                        error: error.message,
                        status: error.response?.status
                    };
                    results.errors.push('CSRF token retrieval failed');
                    console.error('❌ CSRF token retrieval failed:', error.message);
                }
            }
            
        } catch (error) {
            results.errors.push(`Auth flow test failed: ${error.message}`);
            console.error('❌ Auth flow test failed:', error);
        }
        
        console.log('🎉 Auth flow test completed:', results);
        return results;
    },

    /**
     * 監控認證狀態變化
     */
    startAuthMonitoring(intervalMs = 10000) {
        console.log(`🔍 Starting auth monitoring (every ${intervalMs}ms)...`);
        
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 3;
        
        const monitor = setInterval(async () => {
            try {
                const result = await this.testAuthStatus();
                
                if (result.success) {
                    consecutiveErrors = 0;
                    console.log('📊 Auth monitoring: OK', {
                        timestamp: new Date().toISOString(),
                        isAuthenticated: result.data?.data?.isAuthenticated
                    });
                } else {
                    consecutiveErrors++;
                    console.warn(`📊 Auth monitoring: ERROR (${consecutiveErrors}/${maxConsecutiveErrors})`, {
                        timestamp: new Date().toISOString(),
                        error: result.error,
                        status: result.status
                    });
                    
                    if (consecutiveErrors >= maxConsecutiveErrors) {
                        console.error('📊 Auth monitoring: Too many consecutive errors, stopping monitor');
                        clearInterval(monitor);
                    }
                }
                
            } catch (error) {
                consecutiveErrors++;
                console.error(`📊 Auth monitoring: EXCEPTION (${consecutiveErrors}/${maxConsecutiveErrors})`, error);
                
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    console.error('📊 Auth monitoring: Too many consecutive errors, stopping monitor');
                    clearInterval(monitor);
                }
            }
        }, intervalMs);
        
        return monitor;
    }
};

// 在開發環境下將測試工具添加到 window 對象
if (process.env.NODE_ENV === 'development') {
    window.testAuthFix = testAuthFix;
    console.log('🧪 Auth fix test tools available at window.testAuthFix');
}

export default testAuthFix;