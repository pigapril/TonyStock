/**
 * 認證診斷工具
 * 幫助診斷認證相關問題
 */

export const authDiagnostics = {
    /**
     * 檢查瀏覽器環境
     */
    checkBrowserEnvironment() {
        const info = {
            userAgent: navigator.userAgent,
            cookiesEnabled: navigator.cookieEnabled,
            currentURL: window.location.href,
            origin: window.location.origin,
            cookies: document.cookie,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            timestamp: new Date().toISOString()
        };
        
        console.log('🔍 Browser Environment Check:', info);
        return info;
    },

    /**
     * 檢查 API 連接
     */
    async checkApiConnection() {
        const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
        
        try {
            const response = await fetch(`${baseURL}/api/auth/status`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                credentials: 'include' // 包含 cookies
            });
            
            const data = await response.json();
            
            const result = {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries()),
                data: data,
                timestamp: new Date().toISOString()
            };
            
            console.log('🔍 API Connection Check:', result);
            return result;
            
        } catch (error) {
            const result = {
                error: error.message,
                type: error.name,
                timestamp: new Date().toISOString()
            };
            
            console.error('🔍 API Connection Check Failed:', result);
            return result;
        }
    },

    /**
     * 檢查認證狀態
     */
    async diagnoseAuthIssue() {
        console.log('🔍 Starting authentication diagnostics...');
        
        const browserInfo = this.checkBrowserEnvironment();
        const apiInfo = await this.checkApiConnection();
        
        const diagnosis = {
            browser: browserInfo,
            api: apiInfo,
            issues: [],
            recommendations: []
        };
        
        // 分析問題
        if (apiInfo.status === 403) {
            diagnosis.issues.push('API returning 403 for auth status check');
            diagnosis.recommendations.push('Check CSRF middleware configuration');
            diagnosis.recommendations.push('Verify server was restarted after config changes');
        }
        
        if (apiInfo.error && apiInfo.error.includes('CORS')) {
            diagnosis.issues.push('CORS policy blocking request');
            diagnosis.recommendations.push('Check backend CORS configuration');
            diagnosis.recommendations.push('Verify allowed headers in CORS config');
        }
        
        if (apiInfo.error && apiInfo.error.includes('Network Error')) {
            diagnosis.issues.push('Network error - possible CORS or server issue');
            diagnosis.recommendations.push('Check if backend server is running');
            diagnosis.recommendations.push('Verify CORS configuration allows the request');
        }
        
        if (!browserInfo.cookiesEnabled) {
            diagnosis.issues.push('Cookies are disabled in browser');
            diagnosis.recommendations.push('Enable cookies for authentication to work');
        }
        
        if (!browserInfo.cookies) {
            diagnosis.issues.push('No cookies found');
            diagnosis.recommendations.push('User may need to log in again');
        }
        
        console.log('🔍 Authentication Diagnosis:', diagnosis);
        return diagnosis;
    },

    /**
     * 清除認證相關的快取和存儲
     */
    clearAuthCache() {
        console.log('🧹 Clearing authentication cache...');
        
        // 清除 localStorage 中的認證相關項目
        const authKeys = Object.keys(localStorage).filter(key => 
            key.includes('auth') || key.includes('token') || key.includes('user')
        );
        
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`Removed localStorage item: ${key}`);
        });
        
        // 清除 sessionStorage 中的認證相關項目
        const sessionAuthKeys = Object.keys(sessionStorage).filter(key => 
            key.includes('auth') || key.includes('token') || key.includes('user')
        );
        
        sessionAuthKeys.forEach(key => {
            sessionStorage.removeItem(key);
            console.log(`Removed sessionStorage item: ${key}`);
        });
        
        console.log('🧹 Authentication cache cleared');
    }
};

// 在開發環境下將診斷工具添加到 window 對象
if (process.env.NODE_ENV === 'development') {
    window.authDiagnostics = authDiagnostics;
    console.log('🔍 Auth diagnostics available at window.authDiagnostics');
}