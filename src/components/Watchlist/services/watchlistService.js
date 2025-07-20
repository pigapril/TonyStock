import apiClient from '../../../api/apiClient';
import { handleApiError } from '../../../utils/errorHandler';
import csrfClient from '../../../utils/csrfClient'; // 導入 CSRF 客戶端

class WatchlistService {

    /**
     * 獲取包含 CSRF token 和超時設定的 Axios 配置。
     * @private
     * @returns {import('axios').AxiosRequestConfig}
     */
    _getApiConfig() {
        return {
            timeout: 120000 // 120秒
        };
    }

    /**
     * 處理 API 回應，更新 CSRF token 並解包(unwrap)資料。
     * @private
     * @param {Response|import('axios').AxiosResponse} response - Fetch 或 Axios 的回應物件
     * @returns {any} - API 回傳的業務資料
     */
    async _handleApiResponse(response) {
        // 從 'x-csrf-token' 標頭中獲取新的 token
        const newCsrfToken = response.headers.get ? response.headers.get('x-csrf-token') : response.headers['x-csrf-token'];
        if (newCsrfToken) {
            console.log('CSRF Token 更新:', newCsrfToken);
        }

        // 根據回應類型處理資料
        let data;
        if (response.json) {
            // Fetch 回應
            data = await response.json();
        } else {
            // Axios 回應
            data = response.data;
        }

        // 檢查後端自訂的回應結構，如果成功且有 data 屬性，則返回 data.data
        if (data && data.status === 'success' && data.hasOwnProperty('data')) {
            return data.data;
        }

        // 否則，返回整個 data 物件 (兼容舊的或不同的 API 格式)
        return data;
    }

    /**
     * 統一處理 API 呼叫的錯誤。
     * @private
     * @param {Error} error - 拋出的錯誤
     * @param {string} context - 錯誤發生的上下文（例如，函式名稱）
     */
    _handleApiError(error, context) {
        console.error(`WatchlistService Error in ${context}:`, error);
        // 使用通用的錯誤處理器來格式化錯誤，然後重新拋出
        throw handleApiError(error);
    }

    async getCategories() {
        try {
            const response = await csrfClient.fetchWithCSRF('/api/watchlist/categories', {
                method: 'GET'
            });
            const responseData = await this._handleApiResponse(response);

            // 確保返回的是數組
            if (Array.isArray(responseData)) {
                return responseData;
            } else if (responseData && Array.isArray(responseData.categories)) {
                return responseData.categories;
            }

            console.warn('Unexpected categories response format:', responseData);
            return [];
        } catch (error) {
            this._handleApiError(error, 'getCategories');
        }
    }

    async createCategory(name) {
        try {
            const response = await csrfClient.post('/api/watchlist/categories', { name });
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'createCategory');
        }
    }

    async addStock(categoryId, stock) {
        try {
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            const response = await csrfClient.post(`/api/watchlist/categories/${categoryId}/stocks`, { stockSymbol });
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'addStock');
        }
    }

    async removeStock(categoryId, itemId) {
        try {
            const response = await csrfClient.delete(`/api/watchlist/categories/${categoryId}/stocks/${itemId}`);
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'removeStock');
        }
    }

    async searchStocks(keyword) {
        try {
            if (!keyword || keyword.trim() === '') {
                return [];
            }
            // 對於 GET 請求，參數應放在 URL 中
            const response = await csrfClient.fetchWithCSRF(`/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`, {
                method: 'GET'
            });
            const result = await this._handleApiResponse(response);

            if (Array.isArray(result)) {
                return result;
            } else if (result && Array.isArray(result.results)) {
                return result.results;
            }
            return [];
        } catch (error) {
            console.error('搜尋股票失敗:', error);
            // 根據原始邏輯，搜尋失敗時返回空陣列，不向上拋出錯誤
            return [];
        }
    }

    async deleteCategory(categoryId) {
        try {
            const response = await csrfClient.delete(`/api/watchlist/categories/${categoryId}`);
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'deleteCategory');
        }
    }

    async updateCategory(categoryId, name) {
        try {
            const response = await csrfClient.put(`/api/watchlist/categories/${categoryId}`, { name });
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'updateCategory');
        }
    }
}

// 創建單例實例
const watchlistService = new WatchlistService();

export default watchlistService;