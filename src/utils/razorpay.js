/**
 * Dynamically loads the official Razorpay Checkout JavaScript SDK.
 * @returns {Promise<boolean>} Resolves to true when the SDK is loaded, false otherwise.
 */
let razorpayScriptPromise = null;

export const loadRazorpayScript = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('[RAZORPAY] Failed to load Razorpay Checkout SDK script.');
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
};

export default loadRazorpayScript;
