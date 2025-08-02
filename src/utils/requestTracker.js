/**
 * Request Tracker
 * 詳細追蹤認證相關請求，用於診斷間歇性 403 錯誤
 */

class RequestTracker {
    constructor() {
        this.requests = new Map();
        this.maxRequests = 100; // 最多保存 100 個請求記錄
        this.requestCounter = 0;
    }

    /**
     * 生成唯一的請求 ID
     */
    generateRequestId() {
        this.requestCounter++;
        return `req_${Date.now()}_${this.requestCounter}`;
    }

    /**
     * 開始追蹤請求
     */
    startTracking(url, options = {}) {
        const requestId = this.generateRequestId();
        const startTime = Date.now();
        
        const requestInfo = {
            id: requestId,
            url,
            method: options.method || 'GET',
            startTime,
            headers: { ...options.headers },
            credentials: options.credentials,
            cookies: this.getCookies(),
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // 清理舊的請求記錄
        if (this.requests.size >= this.maxRequests) {
            const oldestKey = this.requests.keys().next().value;
            this.requests.delete(oldestKey);
        }

        this.requests.set(requestId, requestInfo);
        
        console.log(`🔍 [${requestId}] Starting request tracking:`, {
            url,
            method: requestInfo.method,
            hasCredentials: !!options.credentials,
            headerCount: Object.keys(requestInfo.headers).length
        });

        return requestId;
    }

    /**
     * 完成請求追蹤
     */
    completeTracking(requestId, response, error = null) {
        const requestInfo = this.requests.get(requestId);
        if (!requestInfo) {
            console.warn(`⚠️ Request tracking not found for ID: ${requestId}`);
            return;
        }

        const endTime = Date.now();
        const duration = endTime - requestInfo.startTime;

        requestInfo.endTime = endTime;
        requestInfo.duration = duration;
        requestInfo.status = error ? 'error' : 'completed';

        if (response) {
            requestInfo.responseStatus = response.status;
            requestInfo.responseStatusText = response.statusText;
            requestInfo.responseHeaders = this.extractResponseHeaders(response);
        }

        if (error) {
            requestInfo.error = {
                message: error.message,
                name: error.name,
                code: error.code,
                stack: error.stack
            };
        }

        const logLevel = this.determineLogLevel(requestInfo);
        const emoji = logLevel === 'error' ? '❌' : logLevel === 'warning' ? '⚠️' : '✅';
        
        console.log(`${emoji} [${requestId}] Request completed:`, {
            url: requestInfo.url,
            status: requestInfo.responseStatus,
            duration: `${duration}ms`,
            success: !error
        });

        // 如果是 403 錯誤，進行詳細分析
        if (requestInfo.responseStatus === 403) {
            this.analyze403Error(requestInfo);
        }

        return requestInfo;
    }

    /**
     * 分析 403 錯誤
     */
    analyze403Error(requestInfo) {
        console.group(`🔍 Analyzing 403 Error for ${requestInfo.id}`);
        
        const analysis = {
            requestId: requestInfo.id,
            url: requestInfo.url,
            timestamp: requestInfo.timestamp,
            duration: requestInfo.duration,
            possibleCauses: [],
            recommendations: []
        };

        // 檢查認證相關的 headers
        if (!requestInfo.headers['Authorization'] && !requestInfo.cookies.includes('accessToken')) {
            analysis.possibleCauses.push('Missing authentication token');
            analysis.recommendations.push('Check if user is properly logged in');
        }

        // 檢查 CSRF token
        if (!requestInfo.headers['X-CSRF-Token'] && requestInfo.method !== 'GET') {
            analysis.possibleCauses.push('Missing CSRF token');
            analysis.recommendations.push('Ensure CSRF token is properly initialized');
        }

        // 檢查 Cloudflare 相關
        if (!requestInfo.headers['X-Custom-Auth-Key']) {
            analysis.possibleCauses.push('Missing Cloudflare auth key');
            analysis.recommendations.push('Check if request is going through proper proxy');
        }

        // 檢查請求頻率
        const recentRequests = this.getRecentRequests(5000); // 最近 5 秒
        if (recentRequests.length > 10) {
            analysis.possibleCauses.push('High request frequency - possible rate limiting');
            analysis.recommendations.push('Implement request throttling');
        }

        console.log('403 Error Analysis:', analysis);
        console.log('Request Details:', {
            headers: requestInfo.headers,
            cookies: requestInfo.cookies,
            responseHeaders: requestInfo.responseHeaders
        });

        console.groupEnd();

        // 儲存分析結果
        requestInfo.analysis = analysis;
        
        // 觸發自定義事件
        this.dispatchAnalysisEvent(analysis);
    }

    /**
     * 獲取當前 cookies
     */
    getCookies() {
        return document.cookie;
    }

    /**
     * 提取回應 headers
     */
    extractResponseHeaders(response) {
        const headers = {};
        if (response.headers) {
            for (const [key, value] of response.headers.entries()) {
                headers[key] = value;
            }
        }
        return headers;
    }

    /**
     * 決定日誌級別
     */
    determineLogLevel(requestInfo) {
        if (requestInfo.error || requestInfo.responseStatus >= 400) {
            return 'error';
        }
        if (requestInfo.duration > 5000) {
            return 'warning';
        }
        return 'info';
    }

    /**
     * 獲取最近的請求
     */
    getRecentRequests(timeWindow = 60000) {
        const now = Date.now();
        return Array.from(this.requests.values()).filter(
            req => (now - req.startTime) <= timeWindow
        );
    }

    /**
     * 獲取錯誤統計
     */
    getErrorStats() {
        const requests = Array.from(this.requests.values());
        const total = requests.length;
        const errors = requests.filter(req => req.status === 'error' || req.responseStatus >= 400);
        const error403 = requests.filter(req => req.responseStatus === 403);
        
        return {
            total,
            errors: errors.length,
            error403: error403.length,
            successRate: total > 0 ? ((total - errors.length) / total * 100).toFixed(2) : 0,
            averageDuration: total > 0 ? (requests.reduce((sum, req) => sum + (req.duration || 0), 0) / total).toFixed(2) : 0
        };
    }

    /**
     * 觸發分析事件
     */
    dispatchAnalysisEvent(analysis) {
        const event = new CustomEvent('auth403Analysis', {
            detail: analysis
        });
        window.dispatchEvent(event);
    }

    /**
     * 獲取特定請求的詳細資訊
     */
    getRequestDetails(requestId) {
        return this.requests.get(requestId);
    }

    /**
     * 獲取所有請求記錄
     */
    getAllRequests() {
        return Array.from(this.requests.values());
    }

    /**
     * 清除所有追蹤記錄
     */
    clearTracking() {
        this.requests.clear();
        this.requestCounter = 0;
        console.log('🧹 Request tracking cleared');
    }

    /**
     * 匯出追蹤資料
     */
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            stats: this.getErrorStats(),
            requests: this.getAllRequests()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auth-requests-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('📁 Request tracking data exported');
    }
}

// 創建全域實例
const requestTracker = new RequestTracker();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.requestTracker = requestTracker;
}

export default requestTracker;