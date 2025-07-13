import apiClient from '../../api/apiClient'; // **新增：引入共用的 apiClient**

// **移除：不再需要手動定義 API_BASE_URL**
// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

export const fetchGoogleTrendsData = async (symbol) => {
    try {
        // **修改：使用 apiClient.get，並用 params 物件傳遞查詢參數**
        const response = await apiClient.get('/api/googletrends/trends', {
            params: { symbol }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching Google Trends data:', error);
        throw error; // 向上拋出錯誤，讓元件處理
    }
};

export const fetchGoogleTrendsMarketData = async () => {
    try {
        // **修改：使用 apiClient.get 呼叫 API**
        const response = await apiClient.get('/api/googletrends/market');
        return response.data;
    } catch (error) {
        console.error('Error fetching Google Trends Market data:', error);
        throw error;
    }
};

export const fetchStockSuggestions = async (keyword) => {
    try {
        // **修改：使用 apiClient.get，並用 params 物件傳遞查詢參數**
        const response = await apiClient.get('/api/googletrends/yahoo-suggestions', {
            params: { keyword }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching stock suggestions:', error);
        throw error;
    }
};