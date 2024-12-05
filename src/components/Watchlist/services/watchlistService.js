import { handleApiError } from '../../../utils/errorHandler';

class WatchlistService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
        this.defaultOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        };
    }

    async fetchRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            console.log('發送請求:', { url, options });
            
            const requestOptions = {
                ...this.defaultOptions,
                ...options,
                headers: {
                    ...this.defaultOptions.headers,
                    ...options.headers
                }
            };

            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw await handleApiError(response);
            }

            const data = await response.json();
            console.log('API 響應:', data);

            if (data.status === 'success' && data.data) {
                return data.data;
            }
            
            return data;
        } catch (error) {
            console.error('Request failed:', error);
            throw handleApiError(error);
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
        try {
            // 確保傳入的是正確的 stock symbol
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            
            const result = await this.fetchRequest(`/api/watchlist/categories/${categoryId}/stocks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ stockSymbol })
            });
            
            return result;
        } catch (error) {
            console.error('Add stock failed:', error);
            throw error;
        }
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
        return this.fetchRequest(
            `/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`,
            { method: 'GET' }
        );
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