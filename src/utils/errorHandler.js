const ErrorMessages = {
    // 可以覆寫後端的錯誤訊息或添加前端特定的錯誤訊息
    NETWORK_ERROR: '網路連線異常，請檢查網路設定',
    TIMEOUT_ERROR: '請求超時，請稍後再試',
    DEFAULT_ERROR: '發生錯誤，請稍後再試'
};

export const handleApiError = (error) => {
    // 如果是 API 回傳的錯誤
    if (error.response?.data) {
        return {
            type: error.response.data.type,
            message: error.response.data.message,
            details: error.response.data.details
        };
    }
    
    // 處理網路錯誤
    if (error.message === 'Network Error') {
        return {
            type: 'NETWORK_ERROR',
            message: ErrorMessages.NETWORK_ERROR
        };
    }
    
    // 處理超時
    if (error.code === 'ECONNABORTED') {
        return {
            type: 'TIMEOUT_ERROR',
            message: ErrorMessages.TIMEOUT_ERROR
        };
    }
    
    // 預設錯誤
    return {
        type: 'UNKNOWN_ERROR',
        message: ErrorMessages.DEFAULT_ERROR
    };
}; 