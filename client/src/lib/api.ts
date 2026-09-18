const DEFAULT_PROD_API = 'https://erp-zrfactory.onrender.com';
const RAW_API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? DEFAULT_PROD_API : '');
const API_BASE = RAW_API_URL ? `${RAW_API_URL.replace(/\/$/, '')}/api` : '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('zr_auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const urlsToTry: string[] = [
    `${API_BASE}${cleanEndpoint}`,
  ];

  // If we are using relative '/api' on localhost, also allow fallback to live Render backend
  if (API_BASE === '/api') {
    urlsToTry.push(`${DEFAULT_PROD_API}/api${cleanEndpoint}`);
  }

  let lastError: any = null;

  for (const url of urlsToTry) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || `Erreur serveur: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data.data as T;
    } catch (error: any) {
      lastError = error;
      // If it was a business error returned by server (e.g. 400, 401, 404), don't retry fallback
      const isNetworkErr = !error?.message || error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.name === 'TypeError';
      if (!isNetworkErr) {
        throw error;
      }
    }
  }

  console.error(`API Request failed for [${endpoint}]:`, lastError);
  throw lastError;
}
