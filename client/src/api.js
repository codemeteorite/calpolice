import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL });

API.interceptors.request.use((config) => {
    const token = localStorage.getItem('cp_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only log errors in non-production
        if (import.meta.env.DEV) {
            console.error('[API] Error:', error.response?.status, error.config?.url, error.message);
        }
        return Promise.reject(error);
    }
);

export default API;
