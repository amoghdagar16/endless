import axios from "axios";
import { getSessionToken, getCompanyId } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
// COMPANY_ID is now fetched dynamically from user's account
// Fallback to env variable for backward compatibility
const STATIC_COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "";
const STATIC_JWT_TOKEN = process.env.NEXT_PUBLIC_JWT_TOKEN || "";

/**
 * Get the current user's company ID
 * Tries to fetch from user account first, falls back to env variable
 */
export async function getCurrentCompanyId(): Promise<string> {
  const userCompanyId = await getCompanyId();
  return userCompanyId || STATIC_COMPANY_ID;
}

// For backward compatibility, export COMPANY_ID as a getter
// But prefer using getCurrentCompanyId() in new code
export const COMPANY_ID = STATIC_COMPANY_ID;

// Create axios instance
const axiosInstance = axios.create();

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(async (config) => {
  // Try to get token from Supabase session first, fallback to static token
  const sessionToken = await getSessionToken();
  const token = sessionToken || STATIC_JWT_TOKEN;
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

export const api = {
  get: async <T = any>(url: string, params?: any): Promise<T> => {
    try {
      return (await axiosInstance.get(API_BASE + url, { params })).data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to backend at ${API_BASE}. Make sure the backend server is running.`);
      }
      throw error;                                                                                                                                                                                                                                                                                                                                                          
    }
  },
  post: async <T = any>(url: string, body?: any): Promise<T> => {
    try {
      return (await axiosInstance.post(API_BASE + url, body)).data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to backend at ${API_BASE}. Make sure the backend server is running.`);
      }
      throw error;
    }
  },
  postFormData: async <T = any>(url: string, formData: FormData): Promise<T> => {
    try {
      // Get token for this request
      const sessionToken = await getSessionToken();
      const token = sessionToken || STATIC_JWT_TOKEN;
      
      return (await axiosInstance.post(API_BASE + url, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        }
      })).data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to backend at ${API_BASE}. Make sure the backend server is running.`);
      }
      throw error;
    }
  },
  delete: async <T = any>(url: string): Promise<T> => {
    try {
      return (await axiosInstance.delete(API_BASE + url)).data;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        throw new Error(`Cannot connect to backend at ${API_BASE}. Make sure the backend server is running.`);
      }
      throw error;
    }
  },
};
