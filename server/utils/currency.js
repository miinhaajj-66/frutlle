/**
 * Server-side Currency Constants and Formatting Utility for FRUTLLE
 * Operating Currency: Indian Rupee (INR / ₹)
 */

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';
export const FREE_SHIPPING_THRESHOLD = 1000;
export const STANDARD_SHIPPING_FEE = 100;
export const TAX_RATE = 0.15;

/**
 * Format a number as Indian Rupee currency (e.g. ₹1,250.00)
 * @param {number|string} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Convert an amount in Rupees to Paise for Razorpay (e.g. ₹1,250.00 -> 125000 paise)
 * @param {number|string} amountInRupees
 * @returns {number} Integer amount in paise
 */
export const toRazorpayPaise = (amountInRupees) => {
  const num = Number(amountInRupees) || 0;
  return Math.round(num * 100);
};

export default formatCurrency;
