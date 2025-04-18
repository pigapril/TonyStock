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
                    ...options.headers
                }
            };

            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => {
                    return { message: `HTTP錯誤: ${response.status}` };
                });
                console.log('API 錯誤回應:', errorData);
                throw errorData;
            }
            
            const data = await response.json();
            console.log('API 響應:', data);

            if (data.status === 'success' && data.data) {
                return data.data;
            } else if (data.status === 'error') {
                throw { message: data.message || '未知錯誤' };
            }
            
            return data;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('請求超時，繼續等待...');
                return this.fetchRequest(endpoint, {
                    ...options,
                    timeout: (options.timeout || this.defaultOptions.timeout) + 30000 // 增加30秒
                });
            }
            
            console.log('完整錯誤物件:', error);
            console.error('Request failed:', error);
            throw error;
        }
    }

    async getCategories() {
        const response = await this.fetchRequest('/api/watchlist/categories', {
            method: 'GET'
        });
        
        // 確保返回的是數組
        if (Array.isArray(response)) {
            return response;
        } else if (response.categories && Array.isArray(response.categories)) {
            return response.categories;
        }
        
        console.warn('Unexpected categories response format:', response);
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