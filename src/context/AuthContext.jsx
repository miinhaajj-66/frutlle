import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { getApiUrl } from '../utils/api';
import { supabase } from '../utils/supabase';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('frutlle_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Configure axios to always send cookies
  axios.defaults.withCredentials = true;

  useEffect(() => {
    const checkAuth = async () => {
      // If returning from OAuth redirect with parameters in the URL, allow Login.jsx / processOAuthCallback to handle token exchange
      const hasOAuthParams = typeof window !== 'undefined' && (
        window.location.search.includes('code=') || 
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('error=') ||
        window.location.hash.includes('error=')
      );
      if (hasOAuthParams) {
        setLoading(false);
        return;
      }

      try {
        // 1. Verify active HTTP-only cookie session directly with Express backend
        const { data } = await axios.get(getApiUrl('/api/auth/profile'), { withCredentials: true });
        if (data && data.role) {
          setUser(data);
          localStorage.setItem('frutlle_user', JSON.stringify(data));
          return;
        }
      } catch {
        // Backend cookie not present or cross-origin restricted
      }

      // 2. Fallback: Check if active Supabase OAuth session exists that can be exchanged
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          const { data: exchangeData } = await axios.post(getApiUrl('/api/auth/google'), {
            accessToken: sessionData.session.access_token
          });
          if (exchangeData && exchangeData.role) {
            setUser(exchangeData);
            localStorage.setItem('frutlle_user', JSON.stringify(exchangeData));
            return;
          }
        }
      } catch {
        // Ignore OAuth session exchange error
      }

      // 3. Fallback: If Supabase has active user, preserve cached user
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const cached = localStorage.getItem('frutlle_user');
          if (cached) {
            setUser(JSON.parse(cached));
            return;
          }
        }
      } catch {
        // Ignore
      }

      // 4. No active session found
      setUser(null);
      localStorage.removeItem('frutlle_user');
      sessionStorage.removeItem('frutlle_coupon');
    };

    checkAuth().finally(() => {
      setLoading(false);
    });
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

  // Opens the luxury confirmation dialog (triggered by any UI Logout button)
  const requestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  // Closes dialog and preserves session ("Stay Signed In", Escape, or click outside)
  const cancelLogout = () => {
    if (isLoggingOut) return;
    setIsLogoutModalOpen(false);
  };

  // Executes the actual backend logout, clears session and redirects ("Yes, Log Out")
  const confirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await axios.post(getApiUrl('/api/auth/logout'));
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout notice:', err);
      }
      setUser(null);
      localStorage.removeItem('frutlle_user');
      sessionStorage.removeItem('frutlle_coupon');
      sessionStorage.removeItem('frutlle_oauth_redirect');
      sessionStorage.removeItem('frutlle_oauth_pending_action');
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
      navigate('/login');
    }
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
    logout: requestLogout, // Standard logout triggers confirmation modal
    requestLogout,
    cancelLogout,
    confirmLogout,
    isLogoutModalOpen,
    isLoggingOut,
    forceLogout: confirmLogout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
