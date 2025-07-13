// 檔案: src/api/apiClient.js
import axios from 'axios';

// 根據環境變數建立一個預先設定好 baseURL 的 axios 實例
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  withCredentials: true, // 如果您的 API 需要處理 cookie 或 session，請保留此行
});

export default apiClient;