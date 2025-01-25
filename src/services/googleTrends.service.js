import axios from 'axios';

const BASE_URL = '/api/google-trends'; // 後端 API 的 base URL

export const searchStocks = async (keyword) => {
    try {
        const response = await axios.get(`/api/stock-search?keyword=${keyword}`); // 修改 API 路徑，**移除 /stock/，關鍵修改**
        return response.data;
    } catch (error) {
        console.error("Error searching stocks:", error);
        throw error;
    }
};

export const getGoogleTrendsData = async (symbol) => {
    try {
        const response = await axios.get(`${BASE_URL}/trends?keyword=${symbol}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching Google Trends data:", error);
        throw error;
    }
}; 