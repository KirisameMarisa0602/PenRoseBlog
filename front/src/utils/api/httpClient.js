import axios from 'axios';

// 基础 axios 实例，统一注入 baseURL 和 token
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

httpClient.interceptors.request.use((config) => {
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      // 后端通常使用 Authorization: Bearer <token>
      // 如有不同可在此处统一调整
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
  }
  return config;
});

export default httpClient;
