import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // 從環境變數取得 API base URL

export const fetchGoogleTrendsData = async (symbol) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/googletrends/trends?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching Google Trends data:', error);
        throw error; // 向上拋出錯誤，讓元件處理
    }
};

export const fetchGoogleTrendsMarketData = async () => {
    try {
        // 呼叫新後端 API，此 API 為 /market，不需要傳遞參數
        const response = await axios.get(`${API_BASE_URL}/api/googletrends/market`);
        return response.data;
    } catch (error) {
        console.error('Error fetching Google Trends Market data:', error);
        throw error;
    }
};

export const fetchStockSuggestions = async (keyword) => {
    try {
        // 修改為使用 Yahoo Finance 搜尋 API
        const response = await axios.get(`${API_BASE_URL}/api/googletrends/yahoo-suggestions?keyword=${keyword}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching stock suggestions:', error);
        throw error;
    }
}; 