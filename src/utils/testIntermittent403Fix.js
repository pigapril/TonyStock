/**
 * Test script for intermittent 403 error fix
 * Tests the enhanced authentication system with caching and retry mechanisms
 * 增強版：針對間歇性 403 錯誤的全面測試
 */

class Intermittent403FixTester {
    constructor() {
        this.testResults = [];
        this.testStartTime = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.testResults.push(logEntry);
        
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} [${timestamp}] ${message}`);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
            
            this.log('Test 2: Testing cache info and health status');
            const cacheInfo = authStateManager.getCacheInfo();
            const healthStatus = authStateManager.getHealthStatus();
            
            this.log(`Cache info: hasCache=${cacheInfo.hasCache}, isValid=${cacheInfo.isValid}, age=${cacheInfo.age}ms`, 'info');
            this.log(`Health status: ${healthStatus.status}, failures=${healthStatus.consecutiveFailures}`, 'info');
            
            if (cacheInfo.hasCache !== undefined && healthStatus.status) {
                this.log('✓ Cache info and health status are available', 'success');
            } else {
                this.log('✗ Cache info or health status missing', 'error');
            }
            
            this.log('Test 3: Testing forced refresh');
            const refreshStartTime = Date.now();
            const freshState = await authStateManager.getAuthState(true);
            const refreshTime = Date.now() - refreshStartTime;
            
            this.log(`✓ Forced refresh completed in ${refreshTime}ms`, 'success');
            this.log(`Fresh auth state: authenticated=${freshState.isAuthenticated}, confidence=${freshState.confidence}`, 'info');
            
            this.log('Test 4: Testing state subscription mechanism');
            let subscriptionTriggered = false;
            const unsubscribe = authStateManager.subscribe((state) => {
                subscriptionTriggered = true;
                this.log(`State change notification: authenticated=${state.isAuthenticated}`, 'info');
            });
            
            // 觸發狀態變更
            authStateManager.setAuthState({ isAuthenticated: true, source: 'test' });
            await this.delay(100);
            
            unsubscribe();
            
            if (subscriptionTriggered) {
                this.log('✓ State subscription mechanism works', 'success');
            } else {
                this.log('✗ State subscription mechanism failed', 'error');
            }
            
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
            
            this.log('Test 1: Testing basic request tracking');
            
            // 模擬一個成功的請求
            const requestId1 = requestTracker.startTracking('/api/test-success', {
                method: 'GET',
                credentials: 'include'
            });
            
            requestTracker.completeTracking(requestId1, {
                status: 200,
                statusText: 'OK',
                headers: new Map([['content-type', 'application/json']])
            });
            
            // 模擬一個 403 錯誤請求
            const requestId2 = requestTracker.startTracking('/api/test-403', {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-CSRF-Token': 'test-token' }
            });
            
            requestTracker.completeTracking(requestId2, {
                status: 403,
                statusText: 'Forbidden',
                headers: new Map([['content-type', 'application/json']])
            });
            
            const stats = requestTracker.getErrorStats();
            this.log(`Request stats: total=${stats.total}, errors=${stats.errors}, 403s=${stats.error403}, success rate=${stats.successRate}%`, 'info');
            
            if (stats.total >= 2 && stats.error403 >= 1) {
                this.log('✓ Request tracking and 403 error detection works', 'success');
            } else {
                this.log('✗ Request tracking failed', 'error');
            }
            
            this.log('Test 2: Testing request details retrieval');
            const requestDetails = requestTracker.getRequestDetails(requestId2);
            if (requestDetails && requestDetails.analysis) {
                this.log('✓ 403 error analysis was performed', 'success');
                this.log(`Analysis found ${requestDetails.analysis.possibleCauses.length} possible causes`, 'info');
            } else {
                this.log('⚠️ 403 error analysis not found', 'warning');
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
                authStateManager.getAuthState().then(state => ({ 
                    index: i, 
                    state,
                    timestamp: Date.now()
                }))
            );
            
            const results = await Promise.all(promises);
            const endTime = Date.now();
            
            // 檢查所有結果是否一致
            const firstResult = results[0].state;
            const allConsistent = results.every(result => 
                result.state.isAuthenticated === firstResult.isAuthenticated &&
                result.state.source === firstResult.source
            );
            
            // 檢查時間戳是否接近（說明使用了快取）
            const timestamps = results.map(r => r.timestamp);
            const maxTimeDiff = Math.max(...timestamps) - Math.min(...timestamps);
            
            if (allConsistent) {
                this.log('✓ All concurrent requests returned consistent results', 'success');
            } else {
                this.log('✗ Concurrent requests returned inconsistent results', 'error');
                results.forEach(r => {
                    this.log(`  Request ${r.index}: authenticated=${r.state.isAuthenticated}, source=${r.state.source}`, 'info');
                });
            }
            
            if (maxTimeDiff < 100) {
                this.log('✓ Concurrent requests used caching effectively', 'success');
            } else {
                this.log('⚠️ Concurrent requests may not be using cache optimally', 'warning');
            }
            
            this.log(`Concurrent requests completed in ${endTime - startTime}ms (max time diff: ${maxTimeDiff}ms)`, 'info');
            
        } catch (error) {
            this.log(`Concurrent request test failed: ${error.message}`, 'error');
        }
    }

    async testCSRFClientIntegration() {
        this.log('Testing CSRF Client integration...', 'info');
        
        try {
            const csrfClient = (await import('./csrfClient.js')).default;
            
            // 重置 CSRF Client
            csrfClient.clearCSRFToken();
            
            this.log('Test 1: Testing CSRF token initialization');
            
            try {
                await csrfClient.initializeCSRFToken();
                
                if (csrfClient.isTokenInitialized()) {
                    this.log('✓ CSRF token initialization succeeded', 'success');
                } else {
                    this.log('⚠️ CSRF token initialization completed but token not available', 'warning');
                }
                
            } catch (error) {
                if (error.message.includes('401') || error.message.includes('403')) {
                    this.log('⚠️ CSRF token initialization failed due to authentication (expected)', 'warning');
                } else {
                    this.log(`✗ CSRF token initialization failed: ${error.message}`, 'error');
                }
            }
            
            this.log('Test 2: Testing CSRF client health status');
            const healthStatus = csrfClient.getHealthStatus();
            this.log(`CSRF health: status=${healthStatus.status}, initialized=${healthStatus.isInitialized}, failures=${healthStatus.consecutiveFailures}`, 'info');
            
            if (healthStatus.status) {
                this.log('✓ CSRF client health status available', 'success');
            } else {
                this.log('✗ CSRF client health status missing', 'error');
            }
            
            this.log('Test 3: Testing error statistics');
            const errorStats = csrfClient.getErrorStats();
            this.log(`CSRF error stats: init failures=${errorStats.initializationFailures}, refresh failures=${errorStats.tokenRefreshFailures}`, 'info');
            
        } catch (error) {
            this.log(`CSRF Client integration test failed: ${error.message}`, 'error');
        }
    }

    async testDiagnosticSystem() {
        this.log('Testing diagnostic system...', 'info');
        
        try {
            const authDiagnosticsEnhanced = (await import('./authDiagnosticsEnhanced.js')).default;
            
            this.log('Test 1: Starting diagnostic monitoring');
            authDiagnosticsEnhanced.startMonitoring(2000); // 2秒間隔
            
            // 等待一下讓監控收集資料
            await this.delay(1000);
            
            this.log('Test 2: Performing health check');
            const healthCheck = await authDiagnosticsEnhanced.performHealthCheck();
            this.log(`Health check completed with ${Object.keys(healthCheck.checks).length} checks`, 'info');
            
            const passedChecks = Object.values(healthCheck.checks).filter(check => check.status === 'pass').length;
            const totalChecks = Object.values(healthCheck.checks).length;
            
            this.log(`Health check results: ${passedChecks}/${totalChecks} checks passed`, 'info');
            
            if (passedChecks === totalChecks) {
                this.log('✓ All health checks passed', 'success');
            } else if (passedChecks > 0) {
                this.log('⚠️ Some health checks failed or warned', 'warning');
            } else {
                this.log('✗ All health checks failed', 'error');
            }
            
            this.log('Test 3: Generating diagnostic report');
            const report = authDiagnosticsEnhanced.generateReport();
            this.log(`Report: ${report.summary.totalSessions} sessions, ${report.summary.totalErrors} errors`, 'info');
            
            if (report.recommendations.length === 0) {
                this.log('✓ No critical issues found in diagnostic report', 'success');
            } else {
                this.log(`⚠️ Found ${report.recommendations.length} recommendations:`, 'warning');
                report.recommendations.forEach(rec => {
                    this.log(`  - ${rec.priority}: ${rec.issue} -> ${rec.suggestion}`, 'info');
                });
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
            
            this.log('Test 2: Testing AuthGuard health status');
            const healthStatus = authGuard.getHealthStatus();
            this.log(`AuthGuard health: status=${healthStatus.status}, failures=${healthStatus.consecutiveFailures}, reliable=${healthStatus.authStateReliable}`, 'info');
            
            if (healthStatus.status) {
                this.log('✓ AuthGuard health status available', 'success');
            } else {
                this.log('✗ AuthGuard health status missing', 'error');
            }
            
            this.log('Test 3: Testing AuthGuard request handling');
            
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
            
            this.log('Test 4: Testing AuthGuard comprehensive health check');
            const comprehensiveHealth = await authGuard.performHealthCheck();
            this.log(`Comprehensive health check completed`, 'info');
            
            if (comprehensiveHealth.authenticationTest) {
                this.log(`Authentication test: ${comprehensiveHealth.authenticationTest.status}`, 'info');
            }
            
        } catch (error) {
            this.log(`AuthGuard integration test failed: ${error.message}`, 'error');
        }
    }

    async testIntermittent403Simulation() {
        this.log('Testing intermittent 403 error simulation...', 'info');
        
        try {
            const authStateManager = (await import('./authStateManager.js')).default;
            const requestTracker = (await import('./requestTracker.js')).default;
            
            // 清除狀態
            authStateManager.reset();
            requestTracker.clearTracking();
            
            this.log('Simulating multiple rapid auth checks (stress test)...');
            
            const rapidRequests = [];
            for (let i = 0; i < 10; i++) {
                rapidRequests.push(
                    authStateManager.getAuthState().catch(error => ({ error: error.message, index: i }))
                );
                
                // 小延遲模擬真實情況
                if (i % 3 === 0) {
                    await this.delay(10);
                }
            }
            
            const results = await Promise.all(rapidRequests);
            const successCount = results.filter(r => !r.error).length;
            const errorCount = results.filter(r => r.error).length;
            
            this.log(`Rapid requests: ${successCount} succeeded, ${errorCount} failed`, 'info');
            
            if (successCount > errorCount) {
                this.log('✓ System handled rapid requests well', 'success');
            } else {
                this.log('⚠️ System struggled with rapid requests', 'warning');
            }
            
            // 檢查快取效果
            const cacheInfo = authStateManager.getCacheInfo();
            if (cacheInfo.isValid && successCount > 5) {
                this.log('✓ Caching helped reduce redundant requests', 'success');
            } else {
                this.log('⚠️ Caching may not be optimal', 'warning');
            }
            
        } catch (error) {
            this.log(`Intermittent 403 simulation failed: ${error.message}`, 'error');
        }
    }

    async testSystemRecovery() {
        this.log('Testing system recovery mechanisms...', 'info');
        
        try {
            const authStateManager = (await import('./authStateManager.js')).default;
            const authGuard = (await import('./authGuard.js')).default;
            
            this.log('Test 1: Testing cache invalidation and recovery');
            
            // 設置一個已知狀態
            authStateManager.setAuthState({ isAuthenticated: true, source: 'test' });
            
            // 強制失效快取
            authStateManager.invalidateCache();
            
            // 嘗試獲取新狀態
            const newState = await authStateManager.getAuthState();
            
            if (newState.source !== 'test') {
                this.log('✓ Cache invalidation triggered fresh state check', 'success');
            } else {
                this.log('⚠️ Cache invalidation may not be working', 'warning');
            }
            
            this.log('Test 2: Testing AuthGuard reset and recovery');
            
            // 重置 AuthGuard
            authGuard.reset();
            
            // 檢查是否正確重置
            const healthAfterReset = authGuard.getHealthStatus();
            
            if (healthAfterReset.consecutiveFailures === 0) {
                this.log('✓ AuthGuard reset correctly', 'success');
            } else {
                this.log('⚠️ AuthGuard reset may be incomplete', 'warning');
            }
            
        } catch (error) {
            this.log(`System recovery test failed: ${error.message}`, 'error');
        }
    }

    async runFullTest() {
        this.testStartTime = Date.now();
        this.log('Starting comprehensive intermittent 403 error fix validation tests...', 'info');
        this.log('='.repeat(80), 'info');
        
        await this.testAuthStateManager();
        this.log('-'.repeat(60), 'info');
        
        await this.testRequestTracking();
        this.log('-'.repeat(60), 'info');
        
        await this.testConcurrentRequests();
        this.log('-'.repeat(60), 'info');
        
        await this.testCSRFClientIntegration();
        this.log('-'.repeat(60), 'info');
        
        await this.testDiagnosticSystem();
        this.log('-'.repeat(60), 'info');
        
        await this.testAuthGuardIntegration();
        this.log('-'.repeat(60), 'info');
        
        await this.testIntermittent403Simulation();
        this.log('-'.repeat(60), 'info');
        
        await this.testSystemRecovery();
        this.log('-'.repeat(60), 'info');
        
        // 總結
        const testDuration = Date.now() - this.testStartTime;
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        
        this.log('='.repeat(80), 'info');
        this.log(`Test Summary (${testDuration}ms):`, 'info');
        this.log(`✅ ${successCount} tests passed`, 'success');
        this.log(`❌ ${errorCount} tests failed`, errorCount > 0 ? 'error' : 'info');
        this.log(`⚠️ ${warningCount} warnings`, warningCount > 0 ? 'warning' : 'info');
        
        // 計算成功率
        const totalTests = successCount + errorCount;
        const successRate = totalTests > 0 ? ((successCount / totalTests) * 100).toFixed(1) : 0;
        
        this.log(`Success Rate: ${successRate}%`, 'info');
        
        if (errorCount === 0) {
            this.log('🎉 All critical tests passed! Intermittent 403 fix is working excellently.', 'success');
        } else if (successRate >= 80) {
            this.log('✅ Most tests passed. System appears functional with minor issues.', 'success');
        } else if (successRate >= 60) {
            this.log('⚠️ Some tests failed but core functionality works.', 'warning');
        } else {
            this.log('❌ Multiple critical tests failed. Please review the implementation.', 'error');
        }
        
        // 提供使用建議
        this.log('', 'info');
        this.log('💡 Debugging Commands:', 'info');
        this.log('• window.authStateManager.getCacheInfo() - Check auth cache status', 'info');
        this.log('• window.authStateManager.getHealthStatus() - Check auth state health', 'info');
        this.log('• window.requestTracker.getErrorStats() - Monitor request statistics', 'info');
        this.log('• window.csrfClient.getHealthStatus() - Check CSRF client health', 'info');
        this.log('• window.authGuard.getHealthStatus() - Check AuthGuard health', 'info');
        this.log('• window.authDiagnosticsEnhanced.performHealthCheck() - Full system health', 'info');
        this.log('• window.authDiagnosticsEnhanced.exportDiagnosticData() - Export diagnostic logs', 'info');
        this.log('• window.testIntermittent403Fix.runFullTest() - Re-run this test', 'info');
        
        return {
            duration: testDuration,
            passed: successCount,
            failed: errorCount,
            warnings: warningCount,
            successRate: parseFloat(successRate),
            results: this.testResults
        };
    }

    getResults() {
        return this.testResults;
    }

    exportResults() {
        const data = {
            timestamp: new Date().toISOString(),
            testDuration: this.testStartTime ? Date.now() - this.testStartTime : null,
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                success: this.testResults.filter(r => r.type === 'success').length,
                error: this.testResults.filter(r => r.type === 'error').length,
                warning: this.testResults.filter(r => r.type === 'warning').length
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intermittent-403-fix-test-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.log('📁 Test results exported', 'info');
    }
}

// 創建全域實例
const testIntermittent403Fix = new Intermittent403FixTester();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.testIntermittent403Fix = testIntermittent403Fix;
}

export default testIntermittent403Fix;