import axios, { AxiosRequestConfig } from "axios";
import { supabase } from '@/lib/supabase';

function resolveApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim() || "";
  if (typeof window === 'undefined') return envBase || "http://127.0.0.1:8001";

  try {
    if (envBase.startsWith('/')) {
      return envBase.replace(/\/$/, '');
    }

    if (!envBase) {
      // In installed PWAs, same-origin API avoids mixed-content and host-rewrite issues.
      return `${window.location.origin}/api`;
    }

    const appHost = window.location.hostname;
    const appProtocol = window.location.protocol;
    const appIsLocal = !appHost || appHost === 'localhost' || appHost === '127.0.0.1';
    if (!appHost || appHost === 'localhost' || appHost === '127.0.0.1') {
      return envBase;
    }

    const parsed = new URL(envBase);
    const apiIsLoopback = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0';

    // Never auto-rewrite loopback targets in secure/non-local contexts.
    // Falling back to same-origin /api is safer for installed PWAs.
    if (!appIsLocal && apiIsLoopback && appProtocol === 'https:') {
      return `${window.location.origin}/api`;
    }

    // If frontend is opened via LAN IP, avoid loopback API host which breaks
    // from that context and causes browser-level "Failed to fetch".
    if (apiIsLoopback) {
      parsed.hostname = appHost;
      return parsed.toString().replace(/\/$/, '');
    }

    // Prevent mixed-content calls when app runs over HTTPS.
    if (appProtocol === 'https:' && parsed.protocol === 'http:') {
      parsed.protocol = 'https:';
      if (parsed.port === '80') parsed.port = '';
      return parsed.toString().replace(/\/$/, '');
    }

    return envBase;
  } catch {
    return `${window.location.origin}/api`;
  }
}

export const API_BASE = resolveApiBase();
export const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "";
const API_TIMEOUT_MS = 8000;

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
    return (await axios.get(API_BASE + url, { params, headers, timeout: API_TIMEOUT_MS })).data;
  },

  post: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.post(API_BASE + url, body, { headers, timeout: API_TIMEOUT_MS })).data;
  },

  patch: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.patch(API_BASE + url, body, { headers, timeout: API_TIMEOUT_MS })).data;
  },

  put: async <T = any>(url: string, body?: any): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.put(API_BASE + url, body, { headers, timeout: API_TIMEOUT_MS })).data;
  },

  delete: async <T = any>(url: string): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.delete(API_BASE + url, { headers, timeout: API_TIMEOUT_MS })).data;
  },

  postFormData: async <T = any>(url: string, formData: FormData): Promise<T> => {
    const headers = await getAuthHeaders();
    return (await axios.post(API_BASE + url, formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data"
      },
      timeout: API_TIMEOUT_MS,
    })).data;
  },
};
