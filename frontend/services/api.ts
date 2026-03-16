import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Use relative path for dev (proxied to Render), full URL for production
let envUrl = (import.meta.env.VITE_API_BASE_URL as string) || '';
if (envUrl && envUrl.endsWith('/')) envUrl = envUrl.slice(0, -1);
if (envUrl && !envUrl.endsWith('/api')) envUrl += '/api';

const API_BASE_URL = import.meta.env.DEV ? '/api' : envUrl;

/**
 * Axios instance configured for the attendance management API
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 90000, // 90 seconds for Render cold starts
});

/**
 * Request interceptor - Add JWT token to requests (except public endpoints)
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // List of public endpoints that don't require authentication
    const publicEndpoints = ['/auth/login', '/auth/refresh', '/teacher/'];
    const isPublicEndpoint = publicEndpoints.some(ep => config.url?.includes(ep));
    
    if (!isPublicEndpoint) {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const publicEndpoints = ['/auth/login', '/auth/refresh', '/teacher/'];
    const isPublicEndpoint = publicEndpoints.some(ep => error.config?.url?.includes(ep));
    
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      if (!isPublicEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user_data');
        window.location.href = '/#/login';
      }
    } else if (error.response?.status === 403) {
      console.error('Access Forbidden: User does not have permission for this resource');
    } else if (error.response?.status === 500) {
      console.error('Server Error: The backend service encountered an error');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

/**
 * Helper function to extract data from API response
 */
export function extractData<T>(response: any): T {
  return response.data?.data || response.data;
}
