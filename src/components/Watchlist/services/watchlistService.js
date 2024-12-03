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

    async addStock(categoryId, stockSymbol) {
        return this.fetchRequest(`/api/watchlist/categories/${categoryId}/stocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stockSymbol })
        });
    }

    async removeStock(categoryId, itemId) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}/stocks/${itemId}`,
            { method: 'DELETE' }
        );
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