import axios, { AxiosRequestConfig } from "axios";
import { supabase } from '@/lib/supabase';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "";

/**
 * Get the current user's JWT token from Supabase
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    if (!supabase) return {};
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        'Authorization': `Bearer ${session.access_token}`
      };
    }
  } catch (error) {
    console.warn('Failed to get auth token:', error);
  }

  return {};
}

/**
 * API client with automatic JWT token injection
 */
export const api = {
  get: async <T = any>(url: string, params?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.get(API_BASE + url, { params, headers })).data;
  },

  post: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.post(API_BASE + url, body, { headers })).data;
  },

  patch: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.patch(API_BASE + url, body, { headers })).data;
  },

  put: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.put(API_BASE + url, body, { headers })).data;
  },

  delete: async <T = any>(url: string): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.delete(API_BASE + url, { headers })).data;
  },

  postFormData: async <T = any>(url: string, formData: FormData): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.post(API_BASE + url, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data"
      }
    })).data;
  },
};
