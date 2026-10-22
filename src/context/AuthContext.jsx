import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { getApiUrl } from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const isExplicitLogoutActive = () => {
  if (typeof window === 'undefined') return false;
  try {
    return (
      sessionStorage.getItem('frutlle_explicit_logout') === 'true' ||
      localStorage.getItem('frutlle_logged_out') === 'true'
    );
  } catch {
    return false;
  }
};

const clearExplicitLogout = () => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('frutlle_explicit_logout');
    localStorage.removeItem('frutlle_logged_out');
  } catch {
    // ignore
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      if (isExplicitLogoutActive()) {
        return null;
      }
      const saved = localStorage.getItem('frutlle_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const authEpochRef = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    let isCancelled = false;
    const requestEpoch = ++authEpochRef.current;

    const isStale = () => {
      return isCancelled || authEpochRef.current !== requestEpoch || isExplicitLogoutActive();
    };

    // 1. Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        try {
          localStorage.removeItem('frutlle_user');
        } catch {
          // ignore
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (isExplicitLogoutActive()) {
          setUser(null);
          return;
        }
      }
    });

    const withTimeout = (promise, ms = 3000) => {
      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    };

    const checkAuth = async () => {
      // If user explicitly logged out or request is stale, do not auto-restore
      if (isStale()) {
        if (!isCancelled && authEpochRef.current === requestEpoch) {
          setUser(null);
          try {
            localStorage.removeItem('frutlle_user');
          } catch {
            // ignore
          }
          setLoading(false);
        }
        return;
      }

      // If returning from OAuth redirect with parameters in the URL, allow Login.jsx / processOAuthCallback to handle token exchange
      const hasOAuthParams = typeof window !== 'undefined' && (
        window.location.search.includes('code=') || 
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('error=') ||
        window.location.hash.includes('error=')
      );
      if (hasOAuthParams) {
        if (!isCancelled && authEpochRef.current === requestEpoch) {
          setLoading(false);
        }
        return;
      }

      let isExplicitlyRejected = false;

      try {
        // 1. Verify active HTTP-only cookie session directly with Express backend
        const { data } = await withTimeout(
          axios.get(getApiUrl('/api/auth/profile'), { withCredentials: true }),
          3000
        );
        if (isStale()) return;
        if (data && data.role) {
          setUser(data);
          try {
            localStorage.setItem('frutlle_user', JSON.stringify(data));
          } catch {
            // ignore
          }
          return;
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          isExplicitlyRejected = true;
        }
      }

      if (isStale()) return;

      // 2. Check if active Supabase OAuth session exists that can be verified and exchanged with backend
      try {
        const sessionRes = await withTimeout(supabase.auth.getSession(), 2500);
        if (isStale()) return;
        const sessionData = sessionRes?.data;
        if (sessionData?.session?.access_token) {
          const { data: exchangeData } = await withTimeout(
            axios.post(getApiUrl('/api/auth/google'), {
              accessToken: sessionData.session.access_token
            }),
            3000
          );
          if (isStale()) return;
          if (exchangeData && exchangeData.role) {
            setUser(exchangeData);
            try {
              localStorage.setItem('frutlle_user', JSON.stringify(exchangeData));
            } catch {
              // ignore
            }
            return;
          }
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          isExplicitlyRejected = true;
        }
      }

      if (isStale()) return;

      // 3. Session resolution:
      // If server explicitly returned 401/403 unauthorized, the session is expired or revoked.
      if (isExplicitlyRejected) {
        setUser(null);
        try {
          localStorage.removeItem('frutlle_user');
        } catch {
          // ignore
        }
      } else {
        // If request timed out or server is temporarily unreachable, do not accidentally wipe
        // an existing valid session from localStorage or create an infinite redirect loop.
        try {
          const cached = localStorage.getItem('frutlle_user');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.role) {
              setUser(parsed);
              return;
            }
          }
        } catch {
          // ignore JSON parse error
        }
        setUser(null);
      }
    };

    checkAuth().finally(() => {
      if (!isCancelled && authEpochRef.current === requestEpoch) {
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const extractErrorMessage = (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.status === 502) {
      return 'Backend server is not reachable (502 Bad Gateway). Please make sure the Express backend is running on port 5000.';
    }
    if (error.response?.status === 503) {
      return 'Authentication service is temporarily unavailable. Please try again shortly.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Network connection error. Unable to reach the server.';
    }
    return error.message || 'Authentication failed. Please try again.';
  };

  const login = async (email, password) => {
    authEpochRef.current += 1;
    clearExplicitLogout();
    setLoading(true);
    try {
      const { data } = await axios.post(getApiUrl('/api/auth/login'), { 
        email: email.trim(), 
        password 
      });
      setUser(data);
      localStorage.setItem('frutlle_user', JSON.stringify(data));
      return { success: true, user: data };
    } catch (error) {
      // Fallback: If customer reset password via Supabase Auth
      try {
        const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (!sbError && sbData?.session?.access_token) {
          const { data: userData } = await axios.post(getApiUrl('/api/auth/google'), {
            accessToken: sbData.session.access_token
          });
          setUser(userData);
          localStorage.setItem('frutlle_user', JSON.stringify(userData));
          return { success: true, user: userData };
        }
      } catch {
        // Fall back to original backend error
      }
      return { 
        success: false, 
        error: extractErrorMessage(error)
      };
    } finally {
      setLoading(false);
    }
  };

  const loginCustomer = (email, password) => login(email, password);
  const loginAdmin = (email, password) => login(email, password);

  const loginWithGoogle = async () => {
    clearExplicitLogout();
    try {
      const origin = (typeof window !== 'undefined' && window.location.origin)
        ? window.location.origin
        : 'https://frutlle.vercel.app';
      const redirectUrl = `${origin}/login`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          },
          skipBrowserRedirect: true
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data?.url) {
        return { success: false, error: 'Failed to generate Google authentication URL.' };
      }

      // Check if Google OAuth provider is enabled in Supabase project dashboard
      try {
        const checkRes = await fetch(data.url, { method: 'GET', redirect: 'manual' });
        if (checkRes.status === 400) {
          const errData = await checkRes.json();
          if (errData?.msg?.includes('provider is not enabled') || errData?.error_code === 'validation_failed') {
            return {
              success: false,
              error: 'Google Sign-In is not enabled yet in your Supabase project dashboard. Please enable Google provider under Authentication → Providers → Google in your Supabase console.'
            };
          }
        }
      } catch {
        // If pre-flight fetch is blocked by CORS/network policy, proceed with browser redirect
      }

      // Proceed with real Google OAuth redirect
      window.location.href = data.url;
      return { success: true };
    } catch (err) {
      return { 
        success: false, 
        error: err.message || 'Failed to initiate Google sign-in.' 
      };
    }
  };

  const processOAuthCallback = async (code, hashTokens = null) => {
    try {
      clearExplicitLogout();
      let session = null;

      // 1. If PKCE authorization code is present, exchange code for session
      if (code) {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.warn('[AUTH] exchangeCodeForSession notice:', exchangeError.message);
        } else if (data?.session) {
          session = data.session;
        }
      }

      // 2. If access_token was passed in URL hash fragment (implicit flow), apply it directly
      if (!session && hashTokens?.accessToken) {
        try {
          const { data: setData } = await supabase.auth.setSession({
            access_token: hashTokens.accessToken,
            refresh_token: hashTokens.refreshToken || ''
          });
          if (setData?.session) {
            session = setData.session;
          }
        } catch (setErr) {
          console.warn('[AUTH] setSession notice:', setErr.message);
        }
      }

      // 3. Fallback: Check if client has session in internal storage
      if (!session) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (!sessionError && sessionData?.session) {
          session = sessionData.session;
        }
      }

      // 4. Brief grace period for async auth state change to settle
      if (!session) {
        session = await new Promise((resolve) => {
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              sub?.unsubscribe?.();
              resolve(null);
            }
          }, 1500);

          const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, s) => {
            if (s?.access_token && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              sub?.unsubscribe?.();
              resolve(s);
            }
          });
        });
      }

      if (!session || !session.access_token) {
        throw new Error('Unable to obtain authenticated OAuth session from Supabase.');
      }

      // 5. Synchronize with Express backend to verify user and set HTTP-only session cookie
      const { data } = await axios.post(getApiUrl('/api/auth/google'), {
        accessToken: session.access_token
      });

      setUser(data);
      localStorage.setItem('frutlle_user', JSON.stringify(data));
      return { success: true, user: data };
    } catch (error) {
      console.error('OAuth callback processing failed:', error.message || 'Authentication error');
      return {
        success: false,
        error: extractErrorMessage(error)
      };
    }
  };

  const socialLogin = async (provider) => {
    if (provider && provider.toLowerCase() === 'google') {
      return await loginWithGoogle();
    }
    return { success: false, error: `Login with ${provider} is not currently supported.` };
  };

  const register = async (name, email, password) => {
    authEpochRef.current += 1;
    clearExplicitLogout();
    setLoading(true);
    try {
      const { data } = await axios.post(getApiUrl('/api/auth/register'), { name, email, password });
      setUser(data);
      localStorage.setItem('frutlle_user', JSON.stringify(data));
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: extractErrorMessage(error)
      };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      const frontendUrl = window.location.origin;
      const redirectTo = `${frontendUrl}/reset-password`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to send reset link.' };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      // 1. Update password in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // 2. Synchronize new password with backend public.users
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        try {
          await axios.post(getApiUrl('/api/auth/reset-password'), {
            accessToken,
            newPassword
          });
        } catch (syncErr) {
          console.warn('[AUTH] Notice synchronizing password with backend:', syncErr.message);
        }
      }

      // 3. Cleanly clear the recovery session
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('[AUTH] Notice clearing recovery session:', signOutErr.message);
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Failed to update password.' };
    }
  };

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  // Opens the luxury confirmation dialog (triggered by any UI Logout button)
  const requestLogout = () => {
    if (isLoggingOutRef.current || isLoggingOut) return;
    setIsLogoutModalOpen(true);
  };

  // Closes dialog and preserves session ("Stay Signed In", Escape, or click outside)
  const cancelLogout = () => {
    if (isLoggingOutRef.current || isLoggingOut) return;
    setIsLogoutModalOpen(false);
  };

  // Executes the actual backend logout, clears session and redirects ("Yes, Log Out")
  const confirmLogout = async () => {
    if (isLoggingOutRef.current || isLoggingOut) return;
    authEpochRef.current += 1;
    isLoggingOutRef.current = true;
    setIsLoggingOut(true);

    // 1. Immediately flag explicit logout in both sessionStorage and localStorage
    try {
      sessionStorage.setItem('frutlle_explicit_logout', 'true');
      localStorage.setItem('frutlle_logged_out', 'true');
    } catch {
      // ignore
    }

    // 2. Request backend to clear HTTP-Only JWT cookie with matching cookie options
    try {
      await axios.post(getApiUrl('/api/auth/logout'), {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error from backend:', error);
    }

    // 3. Await Supabase signOut and cleanly handle errors with fallback to local scope
    try {
      const { error: sbError } = await supabase.auth.signOut();
      if (sbError) {
        console.warn('Supabase global signOut error, falling back to local scope:', sbError.message);
        await supabase.auth.signOut({ scope: 'local' });
      }
    } catch (err) {
      console.warn('Supabase signOut notice, attempting local fallback:', err);
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localErr) {
        console.warn('Supabase local signOut notice:', localErr);
      }
    }

    // 4. Clear app user state and only FRUTLLE-related cached authentication data
    // Cart data (frutlle_cart, frutlle_cart_guest, frutlle_cart_*) and wishlist are preserved
    setUser(null);
    try {
      localStorage.removeItem('frutlle_user');

      // Clear any lingering Supabase auth token keys from localStorage without touching cart/wishlist
      const authKeysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          (key.startsWith('sb-') && (key.includes('auth') || key.includes('token'))) ||
          key.startsWith('supabase.auth.')
        )) {
          authKeysToRemove.push(key);
        }
      }
      authKeysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (storageErr) {
      console.warn('Notice clearing local storage auth keys:', storageErr);
    }

    try {
      sessionStorage.removeItem('frutlle_oauth_redirect');
      sessionStorage.removeItem('frutlle_oauth_pending_action');
    } catch {
      // ignore
    }

    // 5. Clean URL query parameters and hash if any OAuth callback params linger
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      try {
        window.history.replaceState({}, document.title, '/login');
      } catch {
        // ignore
      }
    }

    isLoggingOutRef.current = false;
    setIsLoggingOut(false);
    setIsLogoutModalOpen(false);
    navigate('/login', { replace: true });
  };

  const logout = async (options = {}) => {
    // If explicitly instructed to bypass the confirmation dialog (e.g. force or immediate)
    if (options && (options.force === true || options.immediate === true)) {
      return await confirmLogout();
    }
    // By default, UI calls to logout() open the confirmation modal dialog
    requestLogout();
  };

  const value = {
    user,
    loading,
    login,
    loginCustomer,
    loginAdmin,
    loginWithGoogle,
    processOAuthCallback,
    socialLogin,
    register,
    forgotPassword,
    updatePassword,
    logout,
    requestLogout,
    cancelLogout,
    confirmLogout,
    isLogoutModalOpen,
    isLoggingOut,
    forceLogout: confirmLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
