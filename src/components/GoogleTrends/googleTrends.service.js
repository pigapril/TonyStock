import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL; // 從環境變數取得 API base URL

export const fetchGoogleTrendsData = async (symbol) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/googletrends/trends?symbol=${symbol}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching Google Trends data:', error);
        throw error; // 向上拋出錯誤，讓元件處理
    }
};

export const fetchStockSuggestions = async (keyword) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/googletrends/stock-suggestions?keyword=${keyword}`); // 假設後端 API 路由為 /googletrends/stock-suggestions
        return response.data; // 假設後端返回股票建議列表
    } catch (error) {
        console.error('Error fetching stock suggestions:', error);
        throw error; // 向上拋出錯誤，讓元件處理
    }
}; 