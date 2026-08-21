import axios, { AxiosError } from 'axios';

const envApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const isLocalDev = typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000');

export const API_BASE = envApiUrl 
    ? `${envApiUrl}/api` 
    : (isLocalDev ? '/api' : `http://${window.location.hostname || 'localhost'}:8080/api`);

export const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

// Request Interceptor: Attach JWT Bearer Token if present in sessionStorage
apiClient.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('api_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: string; message?: string }>) => {
        const customMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'API request failed';
        return Promise.reject(new Error(customMessage));
    }
);
