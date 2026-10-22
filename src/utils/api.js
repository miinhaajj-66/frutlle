import axios from 'axios';
import jamStrawberry from '../assets/images/jam_strawberry.jpg';
import jamBlueberry from '../assets/images/jam_blueberry.jpg';
import jamPeach from '../assets/images/jam_peach.jpg';
import jamFig from '../assets/images/jam_fig.jpg';
import jamHero from '../assets/images/jam_hero.jpg';

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

// Catalog assets packaged in public/uploads/ for fast CDN delivery via Vercel
const BUNDLED_STATIC_UPLOADS = new Set([
  'jam_strawberry.jpg',
  'jam_peach.jpg',
  'jam_fig.jpg',
  'jam_blueberry.jpg',
  'jam_hero.jpg',
  'image-1791664848726.jpg',
  'image-1791663397025.jpg',
  'image-1791663259458.jpg',
]);

/**
 * Helper to get a flavor-appropriate fallback image if any asset fails to load.
 *
 * @param {Object} product - Product object
 * @returns {string} Bundled asset URL for fallback
 */
export const getFallbackImage = (product = {}) => {
  const name = (product?.name || '').toLowerCase();
  const cat = (product?.category || '').toLowerCase();
  const desc = (product?.shortDescription || product?.description || '').toLowerCase();
  const text = `${name} ${cat} ${desc}`;

  if (text.includes('blueberr')) return jamBlueberry;
  if (text.includes('peach') || text.includes('marmalade')) return jamPeach;
  if (text.includes('fig')) return jamFig;
  if (text.includes('strawberr')) return jamStrawberry;
  return jamHero;
};

/**
 * Safely format uploaded asset paths (e.g. /uploads/image.jpg).
 * Preserves external URLs, data URLs, and Vite bundled frontend assets.
 * Bundled uploads are served from the frontend CDN (Vercel) to avoid
 * backend cold starts. New backend uploads fall back to API_BASE_URL.
 *
 * @param {string} path - Image or asset path
 * @returns {string} Fully resolved asset URL
 */
export const getAssetUrl = (path = '') => {
  if (!path) return '';
  if (/^(https?:|\/\/|data:|blob:)/i.test(path)) return path;
  if (path.startsWith('/assets/')) return path;

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const filename = cleanPath.split('/').pop();

  // If the file is in our static frontend bundle (public/uploads), serve directly
  if (BUNDLED_STATIC_UPLOADS.has(filename)) {
    return cleanPath;
  }

  // Otherwise route to the backend server (e.g. for dynamic runtime uploads)
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
};

export { axios };
export default axios;
