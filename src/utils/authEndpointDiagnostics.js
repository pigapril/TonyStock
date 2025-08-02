/**
 * Auth Endpoint Diagnostics
 * 專門診斷 /api/auth/status 端點的回應問題
 */

class AuthEndpointDiagnostics {
    constructor() {
        this.diagnosticResults = [];
    }

    /**
     * 診斷認證端點回應
     */
    async diagnoseAuthEndpoint() {
        console.log('🔍 Starting auth endpoint diagnostics...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                issues: []
            }
        };

        // Test 1: 基本連接測試
        await this.testBasicConnection(results);
        
        // Test 2: 回應內容類型測試
        await this.testResponseContentType(results);
        
        // Test 3: Headers 檢查
        await this.testResponseHeaders(results);
        
        // Test 4: 不同請求方法測試
        await this.testDifferentMethods(results);

        // 生成總結
        this.generateSummary(results);
        
        console.log('📋 Auth endpoint diagnostics completed:', results);
        return results;
    }

    /**
     * 測試基本連接
     */
    async testBasicConnection(results) {
        const testName = 'Basic Connection Test';
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const response = await fetch('/api/auth/status', {
                method: 'GET',
                credentials: 'include'
            });

            const test = {
                name: testName,
                status: 'pass',
                details: {
                    httpStatus: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    redirected: response.redirected,
                    type: response.type
                }
            };

            if (response.status !== 200) {
                test.status = 'fail';
                test.issue = `Expected status 200, got ${response.status}`;
                results.summary.issues.push(test.issue);
            }

            results.tests.push(test);
            results.summary.totalTests++;
            if (test.status === 'pass') results.summary.passedTests++;
            else results.summary.failedTests++;

        } catch (error) {
            const test = {
                name: testName,
                status: 'fail',
                error: error.message,
                issue: 'Network request failed'
            };
            
            results.tests.push(test);
            results.summary.totalTests++;
            results.summary.failedTests++;
            results.summary.issues.push(test.issue);
        }
    }

    /**
     * 測試回應內容類型
     */
    async testResponseContentType(results) {
        const testName = 'Response Content Type Test';
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const response = await fetch('/api/auth/status', {
                method: 'GET',
                credentials: 'include'
            });

            const contentType = response.headers.get('content-type');
            const responseText = await response.text();
            
            const test = {
                name: testName,
                status: 'pass',
                details: {
                    contentType,
                    responseLength: responseText.length,
                    responsePreview: responseText.substring(0, 200),
                    isJSON: this.isValidJSON(responseText),
                    isHTML: responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')
                }
            };

            // 檢查是否為預期的 JSON
            if (!contentType || !contentType.includes('application/json')) {
                test.status = 'fail';
                test.issue = `Expected JSON content-type, got: ${contentType}`;
                results.summary.issues.push(test.issue);
            }

            // 檢查是否收到 HTML
            if (test.details.isHTML) {
                test.status = 'fail';
                test.issue = 'Received HTML response instead of JSON';
                results.summary.issues.push(test.issue);
            }

            // 檢查 JSON 有效性
            if (!test.details.isJSON && response.status === 200) {
                test.status = 'fail';
                test.issue = 'Response is not valid JSON';
                results.summary.issues.push(test.issue);
            }

            results.tests.push(test);
            results.summary.totalTests++;
            if (test.status === 'pass') results.summary.passedTests++;
            else results.summary.failedTests++;

        } catch (error) {
            const test = {
                name: testName,
                status: 'fail',
                error: error.message,
                issue: 'Failed to analyze response content'
            };
            
            results.tests.push(test);
            results.summary.totalTests++;
            results.summary.failedTests++;
            results.summary.issues.push(test.issue);
        }
    }

    /**
     * 測試回應 Headers
     */
    async testResponseHeaders(results) {
        const testName = 'Response Headers Test';
        console.log(`🧪 Running: ${testName}`);
        
        try {
            const response = await fetch('/api/auth/status', {
                method: 'GET',
                credentials: 'include'
            });

            const headers = {};
            for (const [key, value] of response.headers.entries()) {
                headers[key] = value;
            }

            const test = {
                name: testName,
                status: 'pass',
                details: {
                    headers,
                    hasCORS: !!headers['access-control-allow-origin'],
                    hasContentType: !!headers['content-type'],
                    server: headers['server'] || 'unknown',
                    poweredBy: headers['x-powered-by'] || 'unknown'
                }
            };

            // 檢查關鍵 headers
            if (!headers['content-type']) {
                test.status = 'warn';
                test.issue = 'Missing Content-Type header';
                results.summary.issues.push(test.issue);
            }

            // 檢查是否被 Cloudflare 攔截
            if (headers['server'] && headers['server'].includes('cloudflare')) {
                test.details.cloudflareDetected = true;
                if (!headers['content-type']?.includes('application/json')) {
                    test.status = 'fail';
                    test.issue = 'Request intercepted by Cloudflare';
                    results.summary.issues.push(test.issue);
                }
            }

            results.tests.push(test);
            results.summary.totalTests++;
            if (test.status === 'pass') results.summary.passedTests++;
            else results.summary.failedTests++;

        } catch (error) {
            const test = {
                name: testName,
                status: 'fail',
                error: error.message,
                issue: 'Failed to analyze response headers'
            };
            
            results.tests.push(test);
            results.summary.totalTests++;
            results.summary.failedTests++;
            results.summary.issues.push(test.issue);
        }
    }

    /**
     * 測試不同請求方法
     */
    async testDifferentMethods(results) {
        const testName = 'Different Request Methods Test';
        console.log(`🧪 Running: ${testName}`);
        
        const methods = ['GET', 'POST', 'OPTIONS'];
        const methodResults = {};

        for (const method of methods) {
            try {
                const response = await fetch('/api/auth/status', {
                    method,
                    credentials: 'include',
                    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {}
                });

                methodResults[method] = {
                    status: response.status,
                    contentType: response.headers.get('content-type'),
                    success: response.ok
                };

            } catch (error) {
                methodResults[method] = {
                    error: error.message,
                    success: false
                };
            }
        }

        const test = {
            name: testName,
            status: methodResults.GET?.success ? 'pass' : 'fail',
            details: methodResults
        };

        if (!methodResults.GET?.success) {
            test.issue = 'GET method failed for auth status endpoint';
            results.summary.issues.push(test.issue);
        }

        results.tests.push(test);
        results.summary.totalTests++;
        if (test.status === 'pass') results.summary.passedTests++;
        else results.summary.failedTests++;
    }

    /**
     * 檢查是否為有效 JSON
     */
    isValidJSON(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 生成診斷總結
     */
    generateSummary(results) {
        const { summary } = results;
        
        console.log('📊 Diagnostic Summary:');
        console.log(`Total Tests: ${summary.totalTests}`);
        console.log(`Passed: ${summary.passedTests}`);
        console.log(`Failed: ${summary.failedTests}`);
        
        if (summary.issues.length > 0) {
            console.log('🚨 Issues Found:');
            summary.issues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        } else {
            console.log('✅ No issues found');
        }

        // 生成建議
        summary.recommendations = this.generateRecommendations(results);
        
        if (summary.recommendations.length > 0) {
            console.log('💡 Recommendations:');
            summary.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
    }

    /**
     * 生成修復建議
     */
    generateRecommendations(results) {
        const recommendations = [];
        const { issues } = results.summary;

        if (issues.some(issue => issue.includes('HTML response'))) {
            recommendations.push('Check if the backend server is running and /api/auth/status endpoint is properly configured');
            recommendations.push('Verify that the request is not being redirected to an error page');
        }

        if (issues.some(issue => issue.includes('Cloudflare'))) {
            recommendations.push('Check Cloudflare configuration and ensure API requests are not being blocked');
            recommendations.push('Verify that the X-Custom-Auth-Key header is being sent correctly');
        }

        if (issues.some(issue => issue.includes('content-type'))) {
            recommendations.push('Ensure the backend endpoint returns proper JSON content-type header');
            recommendations.push('Check if there are any middleware interfering with the response');
        }

        if (issues.some(issue => issue.includes('Network request failed'))) {
            recommendations.push('Check network connectivity and CORS configuration');
            recommendations.push('Verify that the backend server is accessible from the frontend');
        }

        return recommendations;
    }

    /**
     * 匯出診斷結果
     */
    exportResults(results) {
        const blob = new Blob([JSON.stringify(results, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auth-endpoint-diagnostics-${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
        console.log('📁 Diagnostic results exported');
    }
}

// 創建全域實例
const authEndpointDiagnostics = new AuthEndpointDiagnostics();

// 在 window 上暴露以便調試
if (typeof window !== 'undefined') {
    window.authEndpointDiagnostics = authEndpointDiagnostics;
}

export default authEndpointDiagnostics;