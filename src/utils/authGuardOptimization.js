/**
 * AuthGuard 優化建議
 * 減少頁面重新整理時的間歇性 403 錯誤
 */

// 1. 添加 Cookie 就緒檢查
function waitForCookiesReady(timeout = 2000) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function checkCookies() {
            const hasAccessToken = document.cookie.includes('accessToken=');
            const hasRefreshToken = document.cookie.includes('refreshToken=');

            if (hasAccessToken || hasRefreshToken || Date.now() - startTime > timeout) {
                resolve(hasAccessToken || hasRefreshToken);
            } else {
                setTimeout(checkCookies, 50); // 每 50ms 檢查一次
            }
        }

        checkCookies();
    });
}

// 2. 改進的認證初始化
async function improvedAuthInitialization() {
    console.log('🔄 Waiting for cookies to be ready...');

    // 等待 Cookie 就緒
    const hasCookies = await waitForCookiesReady();

    if (!hasCookies) {
        console.log('⚠️ No authentication cookies found, user likely not logged in');
        return { isAuthenticated: false, reason: 'no_cookies' };
    }

    console.log('✅ Cookies ready, proceeding with authentication check');

    // 繼續正常的認證流程
    return await authStateManager.getAuthState();
}

// 3. 防抖動的 API 請求
function debounceApiRequests(func, delay = 100) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// 4. 使用方式
export const optimizedAuthGuard = {
    async ensureAuthenticated() {
        return await improvedAuthInitialization();
    },

    // 防抖動的請求方法
    makeRequest: debounceApiRequests(async (url, options) => {
        await this.ensureAuthenticated();
        return fetch(url, options);
    }, 100)
};