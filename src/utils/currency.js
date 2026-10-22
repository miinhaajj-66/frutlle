/**
 * Shared Indian Rupee (INR / ₹) Currency Formatting Utility for FRUTLLE
 * Formats all numeric values using the Indian numbering system (en-IN).
 * Example: 1250 -> "₹1,250.00", 125000 -> "₹1,25,000.00"
 */

export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Format a number as Indian Rupee currency (e.g. ₹1,250.00)
 * @param {number|string} amount
 * @returns {string} Formatted INR currency string
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
 * Format a number in Indian locale without the currency symbol (e.g. "1,250.00")
 * @param {number|string} amount
 * @returns {string} Formatted number string
 */
export const formatAmountOnly = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '0.00';

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export default formatCurrency;
