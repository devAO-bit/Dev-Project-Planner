import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response) {
          // Handle 401 - Unauthorized
          if (error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }

          // Return formatted error
          return Promise.reject({
            message: error.response.data?.message || 'An error occurred',
            errors: error.response.data?.errors || [],
            status: error.response.status,
          });
        }

        // Network error
        if (error.request) {
          return Promise.reject({
            message: 'Network error. Please check your connection.',
            status: 0,
          });
        }

        return Promise.reject({
          message: error.message || 'An unexpected error occurred',
          status: 0,
        });
      }
    );
  }

  public get<T>(url: string, config = {}) {
    return this.client.get<T>(url, config);
  }

  public post<T>(url: string, data?: unknown, config = {}) {
    return this.client.post<T>(url, data, config);
  }

  public put<T>(url: string, data?: unknown, config = {}) {
    return this.client.put<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}) {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();