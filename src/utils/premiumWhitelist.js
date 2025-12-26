/**
 * Premium Whitelist Utility
 * 
 * 處理付費功能白名單邏輯，讓特定用戶能夠繞過 REACT_APP_TEMPORARY_FREE_MODE 的限制
 */

/**
 * 獲取白名單郵箱列表
 * @returns {string[]} 白名單郵箱列表（已轉為小寫）
 */
function getPremiumWhitelistEmails() {
    const whitelistEnv = process.env.REACT_APP_PREMIUM_WHITELIST_EMAILS;
    if (!whitelistEnv) return [];
    
    return whitelistEnv
        .split(',')
        .map(email => email.trim().toLowerCase())
        .filter(email => email.length > 0);
}

/**
 * 檢查用戶是否在付費功能白名單中
 * @param {string} userEmail - 用戶郵箱
 * @returns {boolean} 是否在白名單中
 */
export function isUserInPremiumWhitelist(userEmail) {
    if (!userEmail) return false;
    
    const whitelist = getPremiumWhitelistEmails();
    return whitelist.includes(userEmail.toLowerCase());
}

/**
 * 檢查用戶是否應該能夠訪問付款功能
 * 考慮臨時免費模式和白名單邏輯
 * @param {string} userEmail - 用戶郵箱
 * @returns {boolean} 是否可以訪問付款功能
 */
export function canAccessPaymentFeatures(userEmail) {
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    
    // 如果沒有啟用臨時免費模式，所有人都可以訪問
    if (!isTemporaryFreeMode) {
        return true;
    }
    
    // 如果啟用了臨時免費模式，只有白名單用戶可以訪問
    return isUserInPremiumWhitelist(userEmail);
}

/**
 * 獲取當前白名單配置信息（用於調試）
 * @returns {object} 白名單配置信息
 */
export function getWhitelistDebugInfo() {
    return {
        isTemporaryFreeMode: process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true',
        whitelistEmails: getPremiumWhitelistEmails(),
        whitelistCount: getPremiumWhitelistEmails().length
    };
}