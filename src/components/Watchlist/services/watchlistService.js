import apiClient from '../../../api/apiClient';
import { handleApiError } from '../../../utils/errorHandler';

class WatchlistService {

    /**
     * 獲取包含 CSRF token 和超時設定的 Axios 配置。
     * @private
     * @returns {import('axios').AxiosRequestConfig}
     */
    _getApiConfig() {
        const headers = {
            'Accept': 'application/json'
        };
        // 如果 window 中存在 CSRF token，則將其加入到請求標頭
        if (window.csrfToken) {
            headers['X-CSRF-Token'] = window.csrfToken;
        }
        return {
            headers: headers,
            timeout: 120000 // 120秒
        };
    }

    /**
     * 處理 API 回應，更新 CSRF token 並解包(unwrap)資料。
     * @private
     * @param {import('axios').AxiosResponse} response - Axios 的回應物件
     * @returns {any} - API 回傳的業務資料
     */
    _handleApiResponse(response) {
        // Axios 將標頭轉為小寫，從 'x-csrf-token' 中獲取新的 token
        const newCsrfToken = response.headers['x-csrf-token'];
        if (newCsrfToken) {
            window.csrfToken = newCsrfToken;
            console.log('CSRF Token 更新:', newCsrfToken);
        }

        const data = response.data;
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
            const response = await apiClient.get('/api/watchlist/categories', this._getApiConfig());
            const responseData = this._handleApiResponse(response);

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
            const response = await apiClient.post('/api/watchlist/categories', { name }, this._getApiConfig());
            return this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'createCategory');
        }
    }

    async addStock(categoryId, stock) {
        try {
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            const response = await apiClient.post(`/api/watchlist/categories/${categoryId}/stocks`, { stockSymbol }, this._getApiConfig());
            return this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'addStock');
        }
    }

    async removeStock(categoryId, itemId) {
        try {
            const response = await apiClient.delete(`/api/watchlist/categories/${categoryId}/stocks/${itemId}`, this._getApiConfig());
            return this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'removeStock');
        }
    }

    async searchStocks(keyword) {
        try {
            if (!keyword || keyword.trim() === '') {
                return [];
            }
            // 對於 GET 請求，參數應放在 params 物件中
            const config = { ...this._getApiConfig(), params: { keyword } };
            const response = await apiClient.get('/api/watchlist/search', config);
            const result = this._handleApiResponse(response);

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
            const response = await apiClient.delete(`/api/watchlist/categories/${categoryId}`, this._getApiConfig());
            return this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'deleteCategory');
        }
    }

    async updateCategory(categoryId, name) {
        try {
            const response = await apiClient.put(`/api/watchlist/categories/${categoryId}`, { name }, this._getApiConfig());
            return this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'updateCategory');
        }
    }
}

// 創建單例實例
const watchlistService = new WatchlistService();

export default watchlistService;