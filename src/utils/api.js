import axios from 'axios';

// Backend API Base URL from Vite environment variable
const rawApiUrl = import.meta.env.VITE_API_URL || '';

// Normalize base URL: trim whitespace and remove any trailing slash
export const API_BASE_URL = rawApiUrl.trim().replace(/\/+$/, '');

// Configure global Axios instance so default requests share base configuration
if (API_BASE_URL) {
  axios.defaults.baseURL = API_BASE_URL;
}
axios.defaults.withCredentials = true;

/**
 * Safely format an API endpoint path with the base URL.
 * Ensures URLs are joined correctly without duplicate or missing slashes.
 * If the endpoint is already an absolute URL (starts with http:// or https://), it is returned as-is.
 * If VITE_API_URL is empty (e.g. during local dev with Vite proxy), returns relative path.
 *
 * @param {string} endpoint - Relative API path (e.g. '/api/products' or 'api/products')
 * @returns {string} Fully resolved API URL
 */
export const getApiUrl = (endpoint = '') => {
  if (!endpoint) return API_BASE_URL;
  if (/^https?:\/\//i.test(endpoint)) return endpoint;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
};

/**
 * Safely format uploaded asset paths (e.g. /uploads/image.jpg).
 * Preserves external URLs, data URLs, and Vite bundled frontend assets.
 *
 * @param {string} path - Image or asset path
 * @returns {string} Fully resolved asset URL
 */
export const getAssetUrl = (path = '') => {
  if (!path) return '';
  if (/^(https?:|\/\/|data:|blob:)/i.test(path)) return path;
  if (path.startsWith('/assets/')) return path;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
};

export { axios };
export default axios;
