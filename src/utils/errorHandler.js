const ErrorMessages = {
    // 後端定義的錯誤
    STOCK_NOT_FOUND: '股票代碼不存在',
    GENERAL_ERROR: '發生錯誤，請稍後再試',
    VALIDATION_ERROR: '輸入資料有誤，請檢查後重試',
    NOT_FOUND: '找不到資源',
    
    // API 相關錯誤
    NETWORK_ERROR: '網路連線異常，請檢查網路設定',
    TIMEOUT_ERROR: '請求超時，請稍後再試',
    
    // 認證相關錯誤
    AUTH_ERROR: '登入失敗，請稍後再試',
    SESSION_EXPIRED: '登入階段已過期，請重新登入',
    UNAUTHORIZED: '請先登入後再繼續',
    
    // 市場情緒指標相關錯誤
    SENTIMENT_DATA_ERROR: '無法取得市場情緒數據',
    HISTORICAL_DATA_ERROR: '無法取得歷史數據',
    
    // 預設錯誤
    DEFAULT_ERROR: '發生錯誤，請稍後再試'
};

export const handleApiError = (error) => {
    // 如果是 API 回傳的錯誤
    if (error.response?.data) {
        const { status, errorCode, message } = error.response.data;
        return {
            status,
            errorCode,
            // 優先使用本地化的錯誤訊息
            message: ErrorMessages[errorCode] || message || ErrorMessages.DEFAULT_ERROR
        };
    }
    
    // 處理網路錯誤
    if (error.message === 'Network Error') {
        return {
            status: 'error',
            errorCode: 'NETWORK_ERROR',
            message: ErrorMessages.NETWORK_ERROR
        };
    }
    
    // 處理超時
    if (error.code === 'ECONNABORTED') {
        return {
            status: 'error',
            errorCode: 'TIMEOUT_ERROR',
            message: ErrorMessages.TIMEOUT_ERROR
        };
    }
    
    // 預設錯誤
    return {
        status: 'error',
        errorCode: 'UNKNOWN_ERROR',
        message: ErrorMessages.DEFAULT_ERROR
    };
};

// 導出錯誤訊息供其他模組使用
export const getErrorMessage = (errorCode) => {
    return ErrorMessages[errorCode] || ErrorMessages.DEFAULT_ERROR;
}; 