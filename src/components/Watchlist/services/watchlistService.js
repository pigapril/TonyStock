import { handleApiError } from '../../../utils/errorHandler';

class WatchlistService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
        this.defaultOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            },
            timeout: 120000  // 120秒
        };
    }

    async fetchRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            console.log('發送請求:', { url, options });
            
            const controller = new AbortController();
            const timeout = options.timeout || this.defaultOptions.timeout;
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const requestOptions = {
                ...this.defaultOptions,
                ...options,
                signal: controller.signal,
                headers: {
                    ...this.defaultOptions.headers,
                    ...(options.headers || {}),
                    // 自動添加 CSRF token (如果有的話)
                    ...(window.csrfToken ? { 'X-CSRF-Token': window.csrfToken } : {})
                }
            };

            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            // 檢查 CSRF token 是否已更新
            const newCsrfToken = response.headers.get('X-CSRF-Token');
            if (newCsrfToken) {
                window.csrfToken = newCsrfToken;
                console.log('CSRF Token 更新:', newCsrfToken);
            }

            // 嘗試解析 JSON，即使回應狀態碼是錯誤的，因為後端可能在 body 中返回錯誤細節
            let data;
            try {
                data = await response.json();
                console.log('API 響應:', data);
            } catch (jsonError) {
                // 如果 JSON 解析失敗，且狀態碼表示成功，這是一個問題
                if (response.ok) {
                    console.error('API 響應成功，但 JSON 解析失敗:', jsonError);
                    throw new Error('Invalid JSON response from server'); // 拋出一個通用錯誤
                }
                // 如果狀態碼表示錯誤，且 JSON 解析失敗，則 data 設為 null 或 {}
                data = null;
                console.warn('API 響應錯誤，且 JSON 解析失敗:', response.status, response.statusText);
            }

            if (!response.ok) {
                // 如果回應不成功 (status code 不是 2xx)
                // 建立一個包含 response 和 data 的錯誤物件
                const error = new Error(data?.message || response.statusText || 'API request failed');
                error.response = { // 附加 response 資訊到錯誤物件
                    status: response.status,
                    statusText: response.statusText,
                    data: data // 將解析後的 data (可能包含 errorCode) 附加到這裡
                };
                console.error('API 請求失敗:', error);
                throw error; // 拋出包含詳細資訊的錯誤
            }

            // 如果 response.ok 為 true，但後端自訂的 status 為 'error'
            if (data && data.status === 'error') {
                 // 建立一個包含 response 和 data 的錯誤物件
                const error = new Error(data.message || 'API returned status "error"');
                 error.response = { // 附加 response 資訊到錯誤物件
                    status: response.status, // 可能是 200 但業務邏輯失敗
                    statusText: response.statusText,
                    data: data // 將包含 errorCode 的 data 附加到這裡
                };
                console.error('API 業務邏輯錯誤:', error);
                throw error; // 拋出包含詳細資訊的錯誤
            }

            // 成功情況 (response.ok 且 data.status 不是 'error')
            // 如果 data 存在且有 data.data 屬性，返回 data.data
            if (data && data.status === 'success' && data.hasOwnProperty('data')) {
                return data.data;
            }
            // 否則，返回整個 data 物件 (兼容舊的或不同的 API 格式)
            return data;
        } catch (error) {
            // 處理 AbortError (超時)
            if (error.name === 'AbortError') {
                console.log('請求超時，正在重試...');
                // 可以選擇重試或拋出超時錯誤
                // return this.fetchRequest(endpoint, { ...options }); // 簡單重試 (可能導致無限循環，需謹慎)
                const timeoutError = new Error('Request timed out');
                timeoutError.code = 'ECONNABORTED'; // 模擬 Axios 的超時 code
                timeoutError.errorCode = 'TIMEOUT_ERROR'; // 添加自訂 errorCode
                console.error('請求超時:', timeoutError);
                throw timeoutError; // 拋出超時錯誤，讓 handleApiError 處理
            }

            // 如果錯誤已經有 response 屬性 (表示是上面 !response.ok 或 data.status === 'error' 拋出的)
            // 或者是非 AbortError 的其他 fetch 錯誤 (例如網路問題)
            console.error('Request failed in catch block:', error);

            // 確保即使是網路錯誤等沒有 response 的錯誤，也能被 handleApiError 處理
            if (!error.response && !error.errorCode) {
                 if (error.message.includes('Failed to fetch')) { // 簡單判斷網路錯誤
                     error.errorCode = 'NETWORK_ERROR';
                 }
            }

            throw error; // 將原始錯誤或附加了信息的錯誤重新拋出
        }
    }

    async getCategories() {
        const responseData = await this.fetchRequest('/api/watchlist/categories', {
            method: 'GET'
        });
        
        // 確保返回的是數組
        if (Array.isArray(responseData)) {
            return responseData;
        } else if (responseData && Array.isArray(responseData.categories)) {
            return responseData.categories;
        }
        
        console.warn('Unexpected categories response format:', responseData);
        return [];
    }

    async createCategory(name) {
        return this.fetchRequest('/api/watchlist/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
    }

    async addStock(categoryId, stock) {
        const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
        
        return this.fetchRequest(`/api/watchlist/categories/${categoryId}/stocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stockSymbol })
        });
    }

    async removeStock(categoryId, itemId) {
        try {
            const result = await this.fetchRequest(
                `/api/watchlist/categories/${categoryId}/stocks/${itemId}`,
                { method: 'DELETE' }
            );
            
            // 確保返回正確的資料結構
            return result;
        } catch (error) {
            console.error('Remove stock failed:', error);
            throw error;  // 讓錯誤繼續往上傳遞
        }
    }

    async searchStocks(keyword) {
        try {
            // 確保關鍵字不為空
            if (!keyword || keyword.trim() === '') {
                return [];
            }
            
            const result = await this.fetchRequest(
                `/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`,
                { method: 'GET' }
            );
            
            // 若 result 為陣列則直接回傳，
            // 若 result 為物件且具有 results 陣列，則回傳該陣列
            if (Array.isArray(result)) {
                return result;
            } else if (result && Array.isArray(result.results)) {
                return result.results;
            }
            
            return [];
        } catch (error) {
            console.error('搜尋股票失敗:', error);
            return []; // 出錯時返回空陣列
        }
    }

    async deleteCategory(categoryId) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}`,
            { method: 'DELETE' }
        );
    }

    async updateCategory(categoryId, name) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            }
        );
    }
}

// 創建單例實例
const watchlistService = new WatchlistService();

export default watchlistService; 