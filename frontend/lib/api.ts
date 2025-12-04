import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Get company ID from localStorage (set during onboarding)
export const getCompanyId = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('company_id') || '';
  }
  return '';
};

// Backward compatibility - for components that haven't migrated yet
export const COMPANY_ID = getCompanyId();

export const api = {
  get: async <T = any>(url: string, params?: any): Promise<T> =>
    (await axios.get(API_BASE + url, { params })).data,
  post: async <T = any>(url: string, body?: any): Promise<T> =>
    (await axios.post(API_BASE + url, body)).data,
  patch: async <T = any>(url: string, body?: any): Promise<T> =>
    (await axios.patch(API_BASE + url, body)).data,
  delete: async <T = any>(url: string): Promise<T> =>
    (await axios.delete(API_BASE + url)).data,
  postFormData: async <T = any>(url: string, formData: FormData): Promise<T> =>
    (await axios.post(API_BASE + url, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })).data,
};
