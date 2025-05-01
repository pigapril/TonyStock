import { Analytics } from './analytics';

// Helper function to determine the error code
const determineErrorCode = (error, t) => {
    let errorCode = 'UNKNOWN_ERROR';
    const isTFunction = typeof t === 'function';

    // a) API 回傳的標準錯誤格式 (最優先)
    if (error.response?.data?.data?.errorCode) {
        errorCode = error.response.data.data.errorCode;
    }
    // b) 前端直接拋出的錯誤 (檢查自定義 errorCode)
    else if (error.errorCode && typeof error.errorCode === 'string') {
        errorCode = error.errorCode;
    }
    // d) 網路錯誤 (優先於檢查 error.code)
    else if (error.message === 'Network Error') {
        errorCode = 'NETWORK_ERROR';
    }
    // e) Axios 超時錯誤 (優先於檢查通用 error.code)
    else if (error.code === 'ECONNABORTED') {
        errorCode = 'TIMEOUT_ERROR';
    }
    // c) 檢查 error.code (放在網路和超時之後)
    else if (error.code) {
        switch (error.code) {
            case 'popup_closed_by_user':
                errorCode = 'GOOGLE_AUTH_CANCELLED';
                break;
            case 'popup_blocked_by_browser':
                errorCode = 'GOOGLE_AUTH_POPUP_BLOCKED';
                break;
            // 可以添加其他已知 code 的映射
            // case 'SOME_OTHER_LIB_CODE':
            //     errorCode = 'SOME_OTHER_LIB_ERROR';
            //     break;
            default:
                // 如果 code 不是已知的特定 code，則視為未知錯誤
                errorCode = 'UNKNOWN_ERROR';
                console.warn(`determineErrorCode: Caught error with code '${error.code}' but it's not a recognized specific code. Treating as UNKNOWN_ERROR.`);
        }
    }
    // f) Turnstile 錯誤 (檢查 message)
    else if (isTFunction && error.message === t('errors.TURNSTILE_REQUIRED')) {
        errorCode = 'TURNSTILE_REQUIRED';
    } else if (isTFunction && error.message === t('errors.TURNSTILE_ERROR')) {
        errorCode = 'TURNSTILE_ERROR';
    } else if (isTFunction && error.message === t('errors.TURNSTILE_EXPIRED')) {
        errorCode = 'TURNSTILE_EXPIRED';
    }
    // g) 其他未知錯誤 (所有條件都不滿足，errorCode 保持 'UNKNOWN_ERROR')

    return errorCode;
};


// Function to handle API errors (logging, showing toast)
export const handleApiError = (error, showToast, t) => {
    console.log('handleApiError received t function type:', typeof t);
    console.error('API Error/Frontend Error:', error);

    let status = error.response?.status || 500;
    // 使用輔助函數獲取 errorCode
    let errorCode = determineErrorCode(error, t);
    let finalMessage = t ? t(`errors.${errorCode}`, t('errors.UNKNOWN_ERROR')) : 'An unknown error occurred.';
    let component = error.component || 'Unknown'; // 嘗試獲取組件信息

    // 確定 component 來源 (可以在 determineErrorCode 內部做，或者在這裡補充)
    if (component === 'Unknown') {
        if (error.response?.data?.data?.errorCode) component = 'API';
        else if (error.errorCode) component = 'FrontendCustom';
        else if (error.message === 'Network Error') component = 'Network';
        else if (error.code === 'ECONNABORTED') component = 'Network';
        else if (error.code?.startsWith('popup_')) component = 'GoogleAuth';
        else if (errorCode.startsWith('TURNSTILE_')) component = 'Turnstile';
    }


    const isShowToastFunction = typeof showToast === 'function';
    const isTFunction = typeof t === 'function';

    const trackError = (errorData) => {
        Analytics.error({
            status: errorData.status,
            errorCode: errorData.errorCode,
            message: `[${errorData.errorCode}] ${errorData.originalMessage || error.message}`,
            component: component, // 使用更新後的 component
            path: window.location.pathname,
            timestamp: new Date().toISOString()
        });
        return {
            errorCode: errorData.errorCode,
            message: errorData.translatedMessage
        };
    };

    // --- 使用確定的 errorCode 進行翻譯 ---
    if (isTFunction) {
        finalMessage = t(`errors.${errorCode}`, t('errors.UNKNOWN_ERROR'));
    } else {
        finalMessage = error.message || 'An unknown error occurred.';
    }
    console.log("Final Error Code:", errorCode, "Translated Message:", finalMessage);


    // --- 追蹤錯誤 ---
    const trackedErrorData = trackError({
        status: status,
        errorCode: errorCode,
        originalMessage: error.message,
        translatedMessage: finalMessage
    });

    // --- 顯示 Toast ---
    if (isShowToastFunction) {
        showToast(finalMessage, status >= 500 || ['NETWORK_ERROR', 'TIMEOUT_ERROR'].includes(errorCode) ? 'error' : 'warning');
    }

    return trackedErrorData;
};

// New function to just translate the error code
export const translateApiError = (error, t) => {
    if (typeof t !== 'function') {
        console.error("translateApiError requires a valid t function.");
        // 返回原始訊息或通用備用訊息
        return error?.message || 'An error occurred.';
    }
    const errorCode = determineErrorCode(error, t);
    // 使用 t 函數翻譯，並提供 UNKNOWN_ERROR 作為備用
    return t(`errors.${errorCode}`, t('errors.UNKNOWN_ERROR'));
}; 