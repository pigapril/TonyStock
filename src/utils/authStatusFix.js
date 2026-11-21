/**
 * Auth Status Fix
 * 修正 /api/auth/status 端點回應 HTML 而不是 JSON 的問題
 */

class AuthStatusFix {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_BASE_URL || '';
    }

            /**
     * 安全的認證狀態檢查
     */
    async checkAuthStatus({ signal } = {}) {
        const url = `${this.baseURL}/api/auth/status`;
        
        try {
            console.log('🔍 AuthStatusFix: Checking auth status with enhanced error handling');
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-store',
                ...(signal ? { signal } : {})
            });

            console.log('📡 AuthStatusFix: Response received:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                redirected: response.redirected,
                contentType: response.headers.get('content-type')
            });

            // 檢查是否被重定向
            if (response.redirected) {
                console.warn('⚠️ AuthStatusFix: Request was redirected to:', response.url);
                throw new Error(`Request redirected to: ${response.url}`);
            }

            // 對於 403 錯誤，提供更詳細的信息
            if (response.status === 403) {
                const responseText = await response.text();
                console.warn('🚫 AuthStatusFix: 403 Forbidden received:', {
                    responseLength: responseText.length,
                    responsePreview: responseText.substring(0, 200),
                    cookies: document.cookie.split(';').map(c => c.trim().split('=')[0])
                });
                
                throw new Error(`HTTP 403: Forbidden - ${responseText.substring(0, 100)}`);
            }

            // 檢查其他錯誤狀態碼
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // 檢查內容類型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.error('🚨 AuthStatusFix: Received non-JSON response:', {
                    contentType,
                    responseLength: responseText.length,
                    responsePreview: responseText.substring(0, 300),
                    isHTML: responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')
                });

                // 如果收到 HTML，可能是錯誤頁面或重定向
                if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                    throw new Error('Received HTML page instead of JSON API response. This may indicate a server configuration issue or request interception.');
                }

                throw new Error(`Expected JSON response but received ${contentType}`);
            }

            // 嘗試解析 JSON
            const data = await response.json();
            
            console.log('✅ AuthStatusFix: Successfully parsed JSON response:', data);
            
            return data.data || { isAuthenticated: false };

        } catch (error) {
            console.error('❌ AuthStatusFix: Auth status check failed:', error);
            
            // 提供詳細的錯誤診斷
            this.logDiagnosticInfo(error, url);
            
            // 返回安全的預設值
            return { 
                isAuthenticated: false, 
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * 記錄診斷資訊
     */
    logDiagnosticInfo(error, url) {
        console.group('🔍 AuthStatusFix Diagnostic Information');
        
        console.log('Error Details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        
        console.log('Request Details:', {
            url,
            baseURL: this.baseURL,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            cookies: document.cookie
        });
        
        console.log('Browser Environment:', {
            online: navigator.onLine,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled
        });
        
        console.log('Network Information:', {
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : 'Not available'
        });
        
        console.groupEnd();
    }

    /**
     * 測試端點可達性
     */
    async testEndpointReachability() {
        const url = `${this.baseURL}/api/auth/status`;
        
        console.log('🧪 AuthStatusFix: Testing endpoint reachability...');
        
        try {
            // 嘗試 HEAD 請求
            const headResponse = await fetch(url, {
                method: 'HEAD',
                credentials: 'include'
            });
            
            console.log('HEAD request result:', {
                status: headResponse.status,
                headers: Object.fromEntries(headResponse.headers.entries())
            });
            
            // 嘗試 OPTIONS 請求
            const optionsResponse = await fetch(url, {
                method: 'OPTIONS',
                credentials: 'include'
            });
            
            console.log('OPTIONS request result:', {
                status: optionsResponse.status,
                headers: Object.fromEntries(optionsResponse.headers.entries())
            });
            
            return {
                headRequest: headResponse.ok,
                optionsRequest: optionsResponse.ok,
                reachable: headResponse.ok || optionsResponse.ok
            };
            
        } catch (error) {
            console.error('Endpoint reachability test failed:', error);
            return {
                headRequest: false,
                optionsRequest: false,
                reachable: false,
                error: error.message
            };
        }
    }

    /**
     * 執行完整診斷
     */
    async runFullDiagnostic() {
        console.log('🔍 AuthStatusFix: Running full diagnostic...');
        
        const results = {
            timestamp: new Date().toISOString(),
            authStatusCheck: null,
            reachabilityTest: null,
            recommendations: []
        };
        
        // 測試認證狀態檢查
        results.authStatusCheck = await this.checkAuthStatus();
        
        // 測試端點可達性
        results.reachabilityTest = await this.testEndpointReachability();
        
        // 生成建議
        if (results.authStatusCheck.error) {
            if (results.authStatusCheck.error.includes('HTML')) {
                results.recommendations.push('Check if the request is being intercepted by a proxy or CDN');
                results.recommendations.push('Verify backend server configuration and routing');
            }
            
            if (results.authStatusCheck.error.includes('redirected')) {
                results.recommendations.push('Check for URL redirects in server configuration');
                results.recommendations.push('Verify that the API endpoint is correctly configured');
            }
            
            if (!results.reachabilityTest.reachable) {
                results.recommendations.push('Check network connectivity to the backend server');
                results.recommendations.push('Verify CORS configuration');
            }
        }
        
        console.log('📋 Full diagnostic results:', results);
        return results;
    }
}

// 創建全域實例
const authStatusFix = new AuthStatusFix();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authStatusFix = authStatusFix;
}

export default authStatusFix;