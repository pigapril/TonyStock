/**
 * Test Auth Status Fix
 * 測試認證狀態修復工具
 */

class TestAuthStatusFix {
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

    async testAuthStatusFix() {
        this.log('Testing Auth Status Fix...', 'info');
        
        try {
            const authStatusFix = (await import('./authStatusFix.js')).default;
            
            this.log('Test 1: Basic auth status check');
            const authResult = await authStatusFix.checkAuthStatus();
            
            if (authResult.error) {
                this.log(`Auth status check returned error: ${authResult.error}`, 'warning');
                
                // 如果有錯誤，執行完整診斷
                this.log('Running full diagnostic due to error...');
                const diagnostic = await authStatusFix.runFullDiagnostic();
                
                this.log(`Diagnostic completed. Recommendations: ${diagnostic.recommendations.length}`, 'info');
                diagnostic.recommendations.forEach((rec, index) => {
                    this.log(`Recommendation ${index + 1}: ${rec}`, 'info');
                });
                
            } else {
                this.log(`✓ Auth status check successful: ${JSON.stringify(authResult)}`, 'success');
            }
            
            this.log('Test 2: Endpoint reachability test');
            const reachability = await authStatusFix.testEndpointReachability();
            
            if (reachability.reachable) {
                this.log('✓ Endpoint is reachable', 'success');
            } else {
                this.log(`✗ Endpoint not reachable: ${reachability.error}`, 'error');
            }
            
        } catch (error) {
            this.log(`Auth status fix test failed: ${error.message}`, 'error');
        }
    }

    async testAuthStateManager() {
        this.log('Testing AuthStateManager with fix...', 'info');
        
        try {
            const authStateManager = (await import('./authStateManager.js')).default;
            
            // 重置狀態
            authStateManager.reset();
            
            this.log('Test 1: Getting auth state with enhanced error handling');
            const authState = await authStateManager.getAuthState();
            
            if (authState.error) {
                this.log(`AuthStateManager returned error: ${authState.error}`, 'warning');
            } else {
                this.log(`✓ AuthStateManager successful: ${JSON.stringify(authState)}`, 'success');
            }
            
            this.log('Test 2: Cache info check');
            const cacheInfo = authStateManager.getCacheInfo();
            this.log(`Cache info: ${JSON.stringify(cacheInfo)}`, 'info');
            
        } catch (error) {
            this.log(`AuthStateManager test failed: ${error.message}`, 'error');
        }
    }

    async testEndpointDiagnostics() {
        this.log('Testing endpoint diagnostics...', 'info');
        
        try {
            const authEndpointDiagnostics = (await import('./authEndpointDiagnostics.js')).default;
            
            this.log('Running comprehensive endpoint diagnostics...');
            const diagnostics = await authEndpointDiagnostics.diagnoseAuthEndpoint();
            
            this.log(`Diagnostics completed: ${diagnostics.summary.passedTests}/${diagnostics.summary.totalTests} tests passed`, 'info');
            
            if (diagnostics.summary.issues.length > 0) {
                this.log(`Found ${diagnostics.summary.issues.length} issues:`, 'warning');
                diagnostics.summary.issues.forEach((issue, index) => {
                    this.log(`Issue ${index + 1}: ${issue}`, 'warning');
                });
            } else {
                this.log('✓ No issues found in endpoint diagnostics', 'success');
            }
            
            if (diagnostics.summary.recommendations.length > 0) {
                this.log('Recommendations:', 'info');
                diagnostics.summary.recommendations.forEach((rec, index) => {
                    this.log(`${index + 1}. ${rec}`, 'info');
                });
            }
            
        } catch (error) {
            this.log(`Endpoint diagnostics test failed: ${error.message}`, 'error');
        }
    }

    async runAllTests() {
        this.log('Starting comprehensive auth status fix tests...', 'info');
        this.log('='.repeat(60), 'info');
        
        await this.testAuthStatusFix();
        this.log('-'.repeat(40), 'info');
        
        await this.testAuthStateManager();
        this.log('-'.repeat(40), 'info');
        
        await this.testEndpointDiagnostics();
        this.log('-'.repeat(40), 'info');
        
        // 總結
        const successCount = this.testResults.filter(r => r.type === 'success').length;
        const errorCount = this.testResults.filter(r => r.type === 'error').length;
        const warningCount = this.testResults.filter(r => r.type === 'warning').length;
        
        this.log('='.repeat(60), 'info');
        this.log(`Test Summary: ${successCount} passed, ${errorCount} failed, ${warningCount} warnings`, 'info');
        
        if (errorCount === 0 && warningCount === 0) {
            this.log('🎉 All tests passed! Auth status fix is working perfectly.', 'success');
        } else if (errorCount === 0) {
            this.log('⚠️ Tests completed with warnings. System is functional but may need attention.', 'warning');
        } else {
            this.log('❌ Some tests failed. Please check the implementation and diagnostics.', 'error');
        }
        
        // 提供使用建議
        this.log('', 'info');
        this.log('💡 Available diagnostic tools:', 'info');
        this.log('- window.authStatusFix.runFullDiagnostic() - Complete auth status diagnostic', 'info');
        this.log('- window.authEndpointDiagnostics.diagnoseAuthEndpoint() - Endpoint analysis', 'info');
        this.log('- window.authStateManager.getCacheInfo() - Check auth cache status', 'info');
        
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
const testAuthStatusFix = new TestAuthStatusFix();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.testAuthStatusFix = testAuthStatusFix;
}

export default testAuthStatusFix;