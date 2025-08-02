/**
 * Test script for intermittent 403 error fix
 * Tests the enhanced authentication system with caching and retry mechanisms
 */

class Intermittent403FixTester {
    constructor() {
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.testResults.push(logEntry);
        
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }

    async testAuthStateManager() {
        this.log('Testing AuthStateManager functionality...', 'info');
        
        try {
            const authStateManager = (await import('./authStateManager.js')).default;
            
            // 重置狀態
            authStateManager.reset();
            
            this.log('Test 1: Testing auth state caching mechanism');
            
            // 測試快取機制
            const startTime = Date.now();
            const state1 = await authStateManager.getAuthState();
            const state2 = await authStateManager.getAuthState(); // 應該使用快取
            const cacheTime = Date.now() - startTime;
            
            if (cacheTime < 100) { // 如果很快完成，說明使用了快取
                this.log('✓ Auth state caching is working correctly', 'success');
            } else {
                this.log('✗ Auth state caching may not be working optimally', 'warning');
            }
            
            this.log('Test 2: Testing cache info');
            const cacheInfo = authStateManager.getCacheInfo();
            this.log(`Cache info: ${JSON.stringify(cacheInfo)}`, 'info');
            
            if (cacheInfo.hasCache) {
                this.log('✓ Cache info is available', 'success');
            } else {
                this.log('⚠️ No cache info available', 'warning');
            }
            
            this.log('Test 3: Testing forced refresh');
            const refreshStartTime = Date.now();
            const freshState = await authStateManager.getAuthState(true);
            const refreshTime = Date.now() - refreshStartTime;
            
            this.log(`✓ Forced refresh completed in ${refreshTime}ms`, 'success');
            this.log(`Fresh auth state: ${JSON.stringify(freshState)}`, 'info');
            
        } catch (error) {
            this.log(`AuthStateManager test failed: ${error.message}`, 'error');
        }
    }

    async testRequestTracking() {
        this.log('Testing request tracking functionality...', 'info');
        
        try {
            const requestTracker = (await import('./requestTracker.js')).default;
            
            // 清除舊的追蹤記錄
            requestTracker.clearTracking();
            
            this.log('Test 1: Testing request tracking');
            
            // 模擬一個請求
            const requestId = requestTracker.startTracking('/api/test', {
                method: 'GET',
                credentials: 'include'
            });
            
            // 模擬完成請求
            setTimeout(() => {
                requestTracker.completeTracking(requestId, {
                    status: 200,
                    statusText: 'OK',
                    headers: new Map([['content-type', 'application/json']])
                });
            }, 100);
            
            // 等待一下讓請求完成
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const stats = requestTracker.getErrorStats();
            this.log(`Request stats: ${JSON.stringify(stats)}`, 'info');
            
            if (stats.total > 0) {
                this.log('✓ Request tracking is working', 'success');
            } else {
                this.log('✗ Request tracking failed', 'error');
            }
            
        } catch (error) {
            this.log(`Request tracking test failed: ${error.message}`, 'error');
        }
    }

    async testConcurrentRequests() {
        this.log('Testing concurrent request handling...', 'info');
        
        try {
            const authStateManager = (await import('./authStateManager.js')).default;
            
            // 重置狀態
            authStateManager.reset();
            
            this.log('Making 5 concurrent auth state requests...');
            
            const startTime = Date.now();
            const promises = Array(5).fill().map((_, i) => 
                authStateManager.getAuthState().then(state => ({ index: i, state }))
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            // 檢查所有結果是否一致
            const firstResult = results[0].state;
            const allConsistent = results.every(result => 
                result.state.isAuthenticated === firstResult.isAuthenticated
            );
            
            if (allConsistent) {
                this.log('✓ All concurrent requests returned consistent results', 'success');
            } else {
                this.log('✗ Concurrent requests returned inconsistent results', 'error');
            }
            
            this.log(`Concurrent requests completed in ${endTime - startTime}ms`, 'info');
            
        } catch (error) {
            this.log(`Concurrent request test failed: ${error.message}`, 'error');
        }
    }

    async testDiagnosticSystem() {
        this.log('Testing diagnostic system...', 'info');
        
        try {
            const authDiagnosticsEnhanced = (await import('./authDiagnosticsEnhanced.js')).default;
            
            this.log('Test 1: Starting diagnostic monitoring');
            authDiagnosticsEnhanced.startMonitoring(5000); // 5秒間隔
            
            // 等待一下讓監控收集資料
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.log('Test 2: Performing health check');
            const healthCheck = await authDiagnosticsEnhanced.performHealthCheck();
            this.log(`Health check result: ${JSON.stringify(healthCheck.checks)}`, 'info');
            
            const allChecksPassed = Object.values(healthCheck.checks).every(
                check => check.status === 'pass'
            );
            
            if (allChecksPassed) {
                this.log('✓ All health checks passed', 'success');
            } else {
                this.log('⚠️ Some health checks failed or warned', 'warning');
            }
            
            this.log('Test 3: Generating diagnostic report');
            const report = authDiagnosticsEnhanced.generateReport();
            this.log(`Report summary: ${JSON.stringify(report.summary)}`, 'info');
            
            if (report.recommendations.length === 0) {
                this.log('✓ No critical issues found in diagnostic report', 'success');
            } else {
                this.log(`⚠️ Found ${report.recommendations.length} recommendations`, 'warning');
            }
            
            // 停止監控
            authDiagnosticsEnhanced.stopMonitoring();
            
        } catch (error) {
            this.log(`Diagnostic system test failed: ${error.message}`, 'error');
        }
    }

    async testAuthGuardIntegration() {
        this.log('Testing AuthGuard integration...', 'info');
        
        try {
            const authGuard = (await import('./authGuard.js')).default;
            
            // 重置 AuthGuard
            authGuard.reset();
            
            this.log('Test 1: Testing AuthGuard authentication check');
            
            try {
                const isAuthenticated = await authGuard.ensureAuthenticated();
                this.log(`Authentication result: ${isAuthenticated}`, 'info');
                
                if (typeof isAuthenticated === 'boolean') {
                    this.log('✓ AuthGuard returned valid authentication status', 'success');
                } else {
                    this.log('✗ AuthGuard returned invalid authentication status', 'error');
                }
                
            } catch (error) {
                this.log(`⚠️ AuthGuard authentication check failed: ${error.message}`, 'warning');
            }
            
            this.log('Test 2: Testing AuthGuard request handling');
            
            try {
                const result = await authGuard.makeAuthenticatedRequest(async () => {
                    // 模擬一個簡單的請求
                    return { success: true, timestamp: Date.now() };
                });
                
                this.log('✓ AuthGuard request handling works', 'success');
                this.log(`Request result: ${JSON.stringify(result)}`, 'info');
                
            } catch (error) {
                if (error.message.includes('Authentication required')) {
                    this.log('✓ AuthGuard correctly handled unauthenticated request', 'success');
                } else {
                    this.log(`⚠️ AuthGuard request error: ${error.message}`, 'warning');
                }
            }
            
        } catch (error) {
            this.log(`AuthGuard integration test failed: ${error.message}`, 'error');
        }
    }

    async runFullTest() {
        this.log('Starting intermittent 403 error fix validation tests...', 'info');
        this.log('='.repeat(60), 'info');
        
        await this.testAuthStateManager();
        this.log('-'.repeat(40), 'info');
        
        await this.testRequestTracking();
        this.log('-'.repeat(40), 'info');
        
        await this.testConcurrentRequests();
        this.log('-'.repeat(40), 'info');
        
        await this.testDiagnosticSystem();
        this.log('-'.repeat(40), 'info');
        
        await this.testAuthGuardIntegration();
        this.log('-'.repeat(40), 'info');
        
        // 總結
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        
        this.log('='.repeat(60), 'info');
        this.log(`Test Summary: ${successCount} passed, ${errorCount} failed, ${warningCount} warnings`, 'info');
        
        if (errorCount === 0) {
            this.log('🎉 All critical tests passed! Intermittent 403 fix is working.', 'success');
        } else if (errorCount < 3) {
            this.log('⚠️ Some tests failed but system appears functional.', 'warning');
        } else {
            this.log('❌ Multiple tests failed. Please check the implementation.', 'error');
        }
        
        // 提供使用建議
        this.log('', 'info');
        this.log('💡 Usage tips:', 'info');
        this.log('- Use window.authStateManager.getCacheInfo() to check auth cache status', 'info');
        this.log('- Use window.requestTracker.getErrorStats() to monitor request statistics', 'info');
        this.log('- Use window.authDiagnosticsEnhanced.performHealthCheck() for system health', 'info');
        this.log('- Use window.authDiagnosticsEnhanced.exportDiagnosticData() to export logs', 'info');
        
        return {
            passed: successCount,
            failed: errorCount,
            warnings: warningCount,
            results: this.testResults
        };
    }

    getResults() {
        return this.testResults;
    }
}

// 創建全域實例
const testIntermittent403Fix = new Intermittent403FixTester();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.testIntermittent403Fix = testIntermittent403Fix;
}

export default testIntermittent403Fix;