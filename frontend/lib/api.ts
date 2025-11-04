import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
export const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "";

export const api = {
  get: async <T = any>(url: string, params?: any): Promise<T> =>
    (await axios.get(API_BASE + url, { params })).data,
  post: async <T = any>(url: string, body?: any): Promise<T> =>
    (await axios.post(API_BASE + url, body)).data,
  postFormData: async <T = any>(url: string, formData: FormData): Promise<T> =>
    (await axios.post(API_BASE + url, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    })).data,
};
