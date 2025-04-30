import { Analytics } from './analytics';

// 2. 定義錯誤碼的 Key 常數 (可選，但建議)
const ErrorKeys = {
    STOCK_NOT_FOUND: 'errorMessages.STOCK_NOT_FOUND',
    GENERAL_ERROR: 'errorMessages.GENERAL_ERROR',
    VALIDATION_ERROR: 'errorMessages.VALIDATION_ERROR',
    NOT_FOUND: 'errorMessages.NOT_FOUND',
    NETWORK_ERROR: 'errorMessages.NETWORK_ERROR',
    TIMEOUT_ERROR: 'errorMessages.TIMEOUT_ERROR',
    AUTH_ERROR: 'errorMessages.AUTH_ERROR',
    SESSION_EXPIRED: 'errorMessages.SESSION_EXPIRED',
    UNAUTHORIZED: 'errorMessages.UNAUTHORIZED',
    SENTIMENT_DATA_ERROR: 'errorMessages.SENTIMENT_DATA_ERROR',
    HISTORICAL_DATA_ERROR: 'errorMessages.HISTORICAL_DATA_ERROR',
    DEFAULT_ERROR: 'errorMessages.DEFAULT_ERROR',
    GOOGLE_AUTH_FAILED: 'errorMessages.GOOGLE_AUTH_FAILED',
    GOOGLE_AUTH_CANCELLED: 'errorMessages.GOOGLE_AUTH_CANCELLED',
    GOOGLE_AUTH_POPUP_BLOCKED: 'errorMessages.GOOGLE_AUTH_POPUP_BLOCKED',
    GOOGLE_AUTH_NETWORK_ERROR: 'errorMessages.GOOGLE_AUTH_NETWORK_ERROR',
    GOOGLE_AUTH_SERVER_ERROR: 'errorMessages.GOOGLE_AUTH_SERVER_ERROR',
    BUTTON_DISABLED: 'errorMessages.BUTTON_DISABLED',
    BUTTON_NETWORK_ERROR: 'errorMessages.BUTTON_NETWORK_ERROR',
    BUTTON_TIMEOUT: 'errorMessages.BUTTON_TIMEOUT',
    STOCK_LIMIT_EXCEEDED: 'errorMessages.STOCK_LIMIT_EXCEEDED',
    CATEGORY_NOT_FOUND: 'errorMessages.CATEGORY_NOT_FOUND',
    CATEGORY_UNAUTHORIZED: 'errorMessages.CATEGORY_UNAUTHORIZED',
    CANNOT_MODIFY_DEFAULT: 'errorMessages.CANNOT_MODIFY_DEFAULT',
    CANNOT_DELETE_DEFAULT: 'errorMessages.CANNOT_DELETE_DEFAULT',
    CANNOT_DELETE_LAST: 'errorMessages.CANNOT_DELETE_LAST',
    DUPLICATE_CATEGORY_NAME: 'errorMessages.DUPLICATE_CATEGORY_NAME',
    DUPLICATE_STOCK: 'errorMessages.DUPLICATE_STOCK',
    CATEGORY_LIMIT_EXCEEDED: 'errorMessages.CATEGORY_LIMIT_EXCEEDED',
    INVALID_STOCK_SYMBOL: 'errorMessages.INVALID_STOCK_SYMBOL',
    API_ERROR: 'errorMessages.API_ERROR',
    UNKNOWN_ERROR: 'errorMessages.UNKNOWN_ERROR'
};

// 3. 修改 handleApiError 函數簽名，加入 t 參數
export const handleApiError = (error, showToast, t) => {
    console.log('handleApiError received t function type:', typeof t);
    console.error('API Error:', error);

    let status = 500;
    let errorCode = 'UNKNOWN_ERROR';
    let message = t ? t('errors.unknown') : '發生未知錯誤，請稍後再試。'; // 使用 t 函數翻譯預設訊息
    let details = null;

    // 確認 showToast 和 t 是否為函數
    const isShowToastFunction = typeof showToast === 'function';
    const isTFunction = typeof t === 'function';

    // 統一錯誤追蹤格式
    const trackError = (errorData) => {
        Analytics.error({
            status: errorData.status,
            errorCode: errorData.errorCode,
            // 注意：這裡的 message 仍然是未翻譯的 key 或原始訊息，
            // Analytics 可能需要調整或記錄 key
            message: errorData.message,
            component: error.component || 'Unknown',
            path: window.location.pathname,
            timestamp: new Date().toISOString()
        });
        return errorData;
    };

    // 如果是 API 回傳的標準錯誤格式 (使用 error.response?.data 安全地存取)
    if (error.response?.data) {
        const errorData = error.response.data;
        status = error.response.status;
        console.log("API error response data:", errorData);

        errorCode = errorData?.data?.errorCode;
        console.log("Error code from API:", errorCode);
        // 4. 使用 ErrorKeys 取得翻譯 key
        message = ErrorKeys[errorCode] || ErrorKeys.DEFAULT_ERROR;

        console.log("Error message key:", message);
        const trackedErrorData = trackError({
            status: errorData.status || 'error',
            errorCode: errorCode || 'API_ERROR',
            message: message // 追蹤時記錄 key
        });

        // 如果有 showToast 回調，則調用它顯示訊息
        if (showToast) {
            // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
            const translatedMessage = t ? t(`apiErrors.${errorCode}`, message) : message;
            showToast(translatedMessage, 'error');
        }

        return trackedErrorData; // 返回包含 key 的錯誤數據
    }

    // Watchlist 特定錯誤處理
    const watchlistErrorKeys = {
        CATEGORY_NOT_FOUND: ErrorKeys.CATEGORY_NOT_FOUND,
        CATEGORY_UNAUTHORIZED: ErrorKeys.CATEGORY_UNAUTHORIZED,
        CANNOT_MODIFY_DEFAULT: ErrorKeys.CANNOT_MODIFY_DEFAULT,
        CANNOT_DELETE_DEFAULT: ErrorKeys.CANNOT_DELETE_DEFAULT,
        CANNOT_DELETE_LAST: ErrorKeys.CANNOT_DELETE_LAST,
        DUPLICATE_CATEGORY_NAME: ErrorKeys.DUPLICATE_CATEGORY_NAME,
        DUPLICATE_STOCK: ErrorKeys.DUPLICATE_STOCK,
        CATEGORY_LIMIT_EXCEEDED: ErrorKeys.CATEGORY_LIMIT_EXCEEDED,
        INVALID_STOCK_SYMBOL: ErrorKeys.INVALID_STOCK_SYMBOL,
        STOCK_LIMIT_EXCEEDED: ErrorKeys.STOCK_LIMIT_EXCEEDED // 重複但保持一致
    };

    if (error.errorCode && watchlistErrorKeys[error.errorCode]) {
        const messageKey = watchlistErrorKeys[error.errorCode];
        const errorData = trackError({
            status: 'error',
            errorCode: error.errorCode,
            message: messageKey // 追蹤時記錄 key
        });

        // 如果有 showToast 回調，則調用它顯示訊息
        if (showToast) {
            // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
            const translatedMessage = t ? t(`apiErrors.${error.errorCode}`, messageKey) : messageKey;
            showToast(translatedMessage, 'error');
        }

        return errorData; // 返回包含 key 的錯誤數據
    }

    // 處理 Google 登入錯誤 (假設 error.code 對應 Google 錯誤)
    // 注意：這裡的 error.code 可能需要根據實際 Google Auth 庫的錯誤格式調整
    const googleAuthErrorMap = {
        'popup_closed_by_user': ErrorKeys.GOOGLE_AUTH_CANCELLED,
        'popup_blocked_by_browser': ErrorKeys.GOOGLE_AUTH_POPUP_BLOCKED,
        // 添加其他可能的 Google 錯誤碼映射
    };
    if (error.code && googleAuthErrorMap[error.code]) {
         const messageKey = googleAuthErrorMap[error.code];
         const errorData = trackError({
            status: 'error',
            errorCode: `GOOGLE_${error.code.toUpperCase()}`, // 構造一個 errorCode
            message: messageKey
        });

        // 如果有 showToast 回調，則調用它顯示訊息
        if (showToast) {
            // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
            const translatedMessage = t ? t(`apiErrors.${errorCode}`, messageKey) : messageKey;
            showToast(translatedMessage, 'error');
        }

        return errorData;
    }


    // 處理網路錯誤
    if (error.message === 'Network Error') {
        const messageKey = ErrorKeys.NETWORK_ERROR;
        const errorData = trackError({
            status: 'error',
            errorCode: 'NETWORK_ERROR',
            message: messageKey
        });

        // 如果有 showToast 回調，則調用它顯示訊息
        if (showToast) {
            // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
            const translatedMessage = t ? t(`apiErrors.${errorCode}`, messageKey) : messageKey;
            showToast(translatedMessage, 'error');
        }

        return errorData;
    }

    // 處理超時
    if (error.code === 'ECONNABORTED') {
        const messageKey = ErrorKeys.TIMEOUT_ERROR;
        const errorData = trackError({
            status: 'error',
            errorCode: 'TIMEOUT_ERROR',
            message: messageKey
        });

        // 如果有 showToast 回調，則調用它顯示訊息
        if (showToast) {
            // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
            const translatedMessage = t ? t(`apiErrors.${errorCode}`, messageKey) : messageKey;
            showToast(translatedMessage, 'error');
        }

        return errorData;
    }

    // 預設錯誤
    console.log("Using default error message key");
    const defaultErrorKey = ErrorKeys.DEFAULT_ERROR;
    const defaultErrorData = trackError({
        status: 'error',
        errorCode: 'UNKNOWN_ERROR',
        message: defaultErrorKey
    });

    // 如果有 showToast 回調，則調用它顯示訊息
    if (showToast) {
        // 嘗試使用 t 函數翻譯後端訊息，如果失敗則使用原始訊息
        const translatedMessage = t ? t(`apiErrors.${errorCode}`, defaultErrorKey) : defaultErrorKey;
        showToast(translatedMessage, 'error');
    }

    return defaultErrorData; // 返回包含 key 的錯誤數據
};

// 5. 修改 getErrorMessage，使其返回 key
export const getErrorMessage = (errorCode) => {
    // 返回對應的 key，如果找不到則返回預設 key
    return ErrorKeys[errorCode] || ErrorKeys.DEFAULT_ERROR;
}; 