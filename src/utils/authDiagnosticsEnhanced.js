/**
 * Enhanced Authentication Diagnostics
 * 增強版認證診斷工具，用於監控和分析間歇性 403 錯誤
 */

import requestTracker from './requestTracker';
import authStateManager from './authStateManager';

class AuthDiagnosticsEnhanced {
    constructor() {
        this.diagnosticData = {
            sessions: [],
            errors: [],
            patterns: {},
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                error403Count: 0,
                averageResponseTime: 0
            }
        };
        
        this.isMonitoring = false;
        this.monitoringInterval = null;
        
        // 監聽 403 錯誤分析事件
        window.addEventListener('auth403Analysis', (event) => {
            this.handleAuth403Analysis(event.detail);
        });
    }

    /**
     * 開始監控認證系統
     */
    startMonitoring(intervalMs = 60000) {
        if (this.isMonitoring) {
            console.warn('⚠️ Auth monitoring is already running');
            return;
        }

        console.log('🔍 Starting enhanced auth diagnostics monitoring...');
        this.isMonitoring = true;
        
        // 定期收集診斷資料
        this.monitoringInterval = setInterval(() => {
            this.collectDiagnosticData();
        }, intervalMs);

        // 立即收集一次資料
        this.collectDiagnosticData();
    }

    /**
     * 停止監控
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }

        console.log('🛑 Stopping auth diagnostics monitoring');
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * 收集診斷資料
     */
    collectDiagnosticData() {
        const timestamp = new Date().toISOString();
        
        // 收集請求統計
        const requestStats = requestTracker.getErrorStats();
        
        // 收集認證狀態資訊
        const authCacheInfo = authStateManager.getCacheInfo();
        
        // 收集瀏覽器資訊
        const browserInfo = this.getBrowserInfo();
        
        // 收集網路資訊
        const networkInfo = this.getNetworkInfo();

        const diagnosticSnapshot = {
            timestamp,
            requestStats,
            authCacheInfo,
            browserInfo,
            networkInfo,
            cookies: this.getCookieInfo(),
            localStorage: this.getLocalStorageInfo()
        };

        this.diagnosticData.sessions.push(diagnosticSnapshot);
        
        // 更新指標
        this.updateMetrics(requestStats);
        
        // 分析模式
        this.analyzePatterns(diagnosticSnapshot);

        console.log('📊 Diagnostic data collected:', {
            timestamp,
            requestStats,
            authReliable: authStateManager.isAuthStateReliable()
        });
    }

    /**
     * 處理 403 錯誤分析
     */
    handleAuth403Analysis(analysis) {
        console.log('🚨 Handling 403 error analysis:', analysis);
        
        this.diagnosticData.errors.push({
            ...analysis,
            browserInfo: this.getBrowserInfo(),
            networkInfo: this.getNetworkInfo(),
            authState: authStateManager.getCacheInfo()
        });

        // 分析錯誤模式
        this.analyzeErrorPatterns(analysis);
    }

    /**
     * 分析錯誤模式
     */
    analyzeErrorPatterns(analysis) {
        const patterns = this.diagnosticData.patterns;
        
        // 按時間分析
        const hour = new Date(analysis.timestamp).getHours();
        patterns.hourly = patterns.hourly || {};
        patterns.hourly[hour] = (patterns.hourly[hour] || 0) + 1;
        
        // 按 URL 分析
        patterns.byUrl = patterns.byUrl || {};
        patterns.byUrl[analysis.url] = (patterns.byUrl[analysis.url] || 0) + 1;
        
        // 按可能原因分析
        analysis.possibleCauses.forEach(cause => {
            patterns.causes = patterns.causes || {};
            patterns.causes[cause] = (patterns.causes[cause] || 0) + 1;
        });

        console.log('📈 Error patterns updated:', patterns);
    }

    /**
     * 更新指標
     */
    updateMetrics(requestStats) {
        const metrics = this.diagnosticData.metrics;
        
        metrics.totalRequests = requestStats.total;
        metrics.successfulRequests = requestStats.total - requestStats.errors;
        metrics.failedRequests = requestStats.errors;
        metrics.error403Count = requestStats.error403;
        metrics.averageResponseTime = parseFloat(requestStats.averageDuration);
        metrics.successRate = parseFloat(requestStats.successRate);
    }

    /**
     * 分析模式
     */
    analyzePatterns(snapshot) {
        // 檢查是否有異常模式
        if (snapshot.requestStats.error403 > 0) {
            console.warn('⚠️ 403 errors detected in current session');
        }
        
        if (snapshot.requestStats.successRate < 90) {
            console.warn('⚠️ Low success rate detected:', snapshot.requestStats.successRate + '%');
        }
        
        if (!snapshot.authCacheInfo.isValid && snapshot.authCacheInfo.hasCache) {
            console.warn('⚠️ Auth cache is invalid');
        }
    }

    /**
     * 獲取瀏覽器資訊
     */
    getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform,
            vendor: navigator.vendor
        };
    }

    /**
     * 獲取網路資訊
     */
    getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        return {
            online: navigator.onLine,
            effectiveType: connection?.effectiveType,
            downlink: connection?.downlink,
            rtt: connection?.rtt,
            saveData: connection?.saveData
        };
    }

    /**
     * 獲取 Cookie 資訊
     */
    getCookieInfo() {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [name] = cookie.trim().split('=');
            if (name) {
                acc[name] = true; // 不記錄實際值，只記錄是否存在
            }
            return acc;
        }, {});

        return {
            count: Object.keys(cookies).length,
            hasAccessToken: 'accessToken' in cookies,
            hasCSRFToken: 'csrf_token' in cookies,
            cookieNames: Object.keys(cookies)
        };
    }

    /**
     * 獲取 LocalStorage 資訊
     */
    getLocalStorageInfo() {
        try {
            return {
                available: typeof localStorage !== 'undefined',
                itemCount: localStorage.length,
                hasAuthData: localStorage.getItem('authData') !== null
            };
        } catch (error) {
            return {
                available: false,
                error: error.message
            };
        }
    }

    /**
     * 執行健康檢查
     */
    async performHealthCheck() {
        console.log('🏥 Performing auth system health check...');
        
        const healthCheck = {
            timestamp: new Date().toISOString(),
            checks: {}
        };

        // 檢查認證狀態
        try {
            const authState = await authStateManager.getAuthState(true); // 強制刷新
            healthCheck.checks.authState = {
                status: 'pass',
                isAuthenticated: authState.isAuthenticated,
                confidence: authState.confidence
            };
        } catch (error) {
            healthCheck.checks.authState = {
                status: 'fail',
                error: error.message
            };
        }

        // 檢查請求統計
        const requestStats = requestTracker.getErrorStats();
        healthCheck.checks.requestStats = {
            status: requestStats.successRate > 90 ? 'pass' : 'warn',
            successRate: requestStats.successRate,
            error403Count: requestStats.error403
        };

        // 檢查瀏覽器環境
        healthCheck.checks.browser = {
            status: navigator.onLine ? 'pass' : 'fail',
            online: navigator.onLine,
            cookieEnabled: navigator.cookieEnabled
        };

        console.log('🏥 Health check completed:', healthCheck);
        return healthCheck;
    }

    /**
     * 生成診斷報告
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                monitoringDuration: this.isMonitoring ? 'Active' : 'Stopped',
                totalSessions: this.diagnosticData.sessions.length,
                totalErrors: this.diagnosticData.errors.length,
                currentMetrics: this.diagnosticData.metrics
            },
            patterns: this.diagnosticData.patterns,
            recentErrors: this.diagnosticData.errors.slice(-5),
            recommendations: this.generateRecommendations()
        };

        console.log('📋 Diagnostic report generated:', report);
        return report;
    }

    /**
     * 生成建議
     */
    generateRecommendations() {
        const recommendations = [];
        const metrics = this.diagnosticData.metrics;

        if (metrics.error403Count > 0) {
            recommendations.push({
                priority: 'high',
                issue: '403 errors detected',
                suggestion: 'Check authentication middleware and session handling'
            });
        }

        if (metrics.successRate < 95) {
            recommendations.push({
                priority: 'medium',
                issue: 'Low success rate',
                suggestion: 'Implement more robust retry mechanisms'
            });
        }

        if (!authStateManager.isAuthStateReliable()) {
            recommendations.push({
                priority: 'medium',
                issue: 'Unreliable auth state',
                suggestion: 'Consider increasing cache timeout or improving state validation'
            });
        }

        return recommendations;
    }

    /**
     * 匯出診斷資料
     */
    exportDiagnosticData() {
        const data = {
            ...this.diagnosticData,
            exportTimestamp: new Date().toISOString(),
            report: this.generateReport()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auth-diagnostics-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        console.log('📁 Diagnostic data exported');
    }

    /**
     * 清除診斷資料
     */
    clearDiagnosticData() {
        this.diagnosticData = {
            sessions: [],
            errors: [],
            patterns: {},
            metrics: {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                error403Count: 0,
                averageResponseTime: 0
            }
        };
        console.log('🧹 Diagnostic data cleared');
    }
}

// 創建全域實例
const authDiagnosticsEnhanced = new AuthDiagnosticsEnhanced();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authDiagnosticsEnhanced = authDiagnosticsEnhanced;
}

export default authDiagnosticsEnhanced;