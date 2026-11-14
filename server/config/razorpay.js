import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Safe diagnostic that reports whether RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * are present and non-empty. NEVER exposes or prints actual credential values.
 * @returns {{ isConfigured: boolean, keyIdPresent: boolean, keyIdNonEmpty: boolean, keySecretPresent: boolean, keySecretNonEmpty: boolean }}
 */
export const getRazorpayDiagnostics = () => {
  const keyIdRaw = process.env.RAZORPAY_KEY_ID;
  const keySecretRaw = process.env.RAZORPAY_KEY_SECRET;

  const keyIdPresent = typeof keyIdRaw === 'string';
  const keyIdNonEmpty = keyIdPresent && keyIdRaw.trim().length > 0;

  const keySecretPresent = typeof keySecretRaw === 'string';
  const keySecretNonEmpty = keySecretPresent && keySecretRaw.trim().length > 0;

  return {
    isConfigured: keyIdNonEmpty && keySecretNonEmpty,
    keyIdPresent,
    keyIdNonEmpty,
    keySecretPresent,
    keySecretNonEmpty
  };
};

/**
 * Checks if Razorpay credentials are fully configured in the environment.
 * @returns {boolean}
 */
export const isRazorpayConfigured = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  return Boolean(keyId && keySecret);
};

/**
 * Returns the public Razorpay Key ID.
 * Safe to expose to the client.
 * @returns {string}
 */
export const getRazorpayKeyId = () => {
  return (process.env.RAZORPAY_KEY_ID || '').trim();
};

/**
 * Returns an instance of the Razorpay Node SDK.
 * Reads RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET from process.env.
 * Throws a descriptive error if credentials are missing.
 * @returns {Razorpay}
 */
export const getRazorpayInstance = () => {
  const key_id = getRazorpayKeyId();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (!key_id || !key_secret) {
    const error = new Error('Razorpay credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    error.statusCode = 503;
    throw error;
  }

  // Enforce Test Mode safety check:
  // In development/test mode, key_id typically begins with "rzp_test_"
  if (!key_id.startsWith('rzp_test_')) {
    console.warn('[RAZORPAY WARNING] Key ID does not start with "rzp_test_". Ensure this is intentional and not running in unexpected live mode.');
  }

  return new Razorpay({
    key_id,
    key_secret
  });
};

export default getRazorpayInstance;
