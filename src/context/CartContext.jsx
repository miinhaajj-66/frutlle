import { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios, { getApiUrl } from '../utils/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const GUEST_KEY = 'frutlle_cart_guest';
const LEGACY_KEY = 'frutlle_cart';

const getUserKey = (userId) => (userId ? `frutlle_cart_${userId}` : GUEST_KEY);

const readCartFromStorage = (key) => {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Merges guest items into an existing user cart without duplicates
const mergeCarts = (userCart, guestCart) => {
  if (!Array.isArray(guestCart) || guestCart.length === 0) return userCart;
  const merged = [...userCart];

  for (const guestItem of guestCart) {
    const gId = String(guestItem.id || guestItem._id);
    const existingIndex = merged.findIndex((item) => String(item.id || item._id) === gId);

    if (existingIndex > -1) {
      const maxStock = merged[existingIndex].countInStock || merged[existingIndex].count_in_stock || 99;
      merged[existingIndex] = {
        ...merged[existingIndex],
        quantity: Math.min(maxStock, merged[existingIndex].quantity + (guestItem.quantity || 1))
      };
    } else {
      merged.push({
        ...guestItem,
        id: gId,
        _id: gId,
        quantity: guestItem.quantity || 1
      });
    }
  }

  return merged;
};

export const CartProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  // References to guarantee race-condition-free user transitions
  const activeUserIdRef = useRef(null);
  const requestSeqRef = useRef(0);

  // Synchronize cart state on auth transitions (Login, Logout, Account Switch)
  useEffect(() => {
    // If authentication check is still initializing, remain in loading state
    if (authLoading) {
      setCartLoading(true);
      return;
    }

    const currentSeq = ++requestSeqRef.current;
    const targetUserId = user ? String(user.id || user._id) : null;
    activeUserIdRef.current = targetUserId;

    // 1. Purge legacy un-scoped cart key safely
    try {
      const legacyCart = localStorage.getItem(LEGACY_KEY);
      if (legacyCart) {
        if (!targetUserId && !localStorage.getItem(GUEST_KEY)) {
          localStorage.setItem(GUEST_KEY, legacyCart);
        }
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch {
      // Ignore localStorage read errors
    }

    // 2. Scenario: Guest / Unauthenticated Visitor
    if (!targetUserId) {
      const guestItems = readCartFromStorage(GUEST_KEY);
      setCart(guestItems);
      setCartLoading(false);
      return;
    }

    // 3. Scenario: Authenticated User (User A, User B, Account Switch)
    // Immediately clear in-memory cart to prevent any momentary data leakage
    setCart([]);
    setCartLoading(true);

    const userStorageKey = getUserKey(targetUserId);
    const cachedUserItems = readCartFromStorage(userStorageKey);
    const guestItems = readCartFromStorage(GUEST_KEY);

    // If there were items added as a guest before logging in, merge them in
    let initialUserItems = cachedUserItems;
    let hadGuestMerge = false;

    if (guestItems.length > 0) {
      initialUserItems = mergeCarts(cachedUserItems, guestItems);
      hadGuestMerge = true;
      // Immediately clear the guest cart so it cannot leak to any subsequent visitor
      localStorage.removeItem(GUEST_KEY);
      localStorage.setItem(userStorageKey, JSON.stringify(initialUserItems));
      setCart(initialUserItems);
    } else if (cachedUserItems.length > 0) {
      setCart(cachedUserItems);
    }

    // 4. Asynchronously resolve authoritative cart from the database backend
    axios
      .get(getApiUrl('/api/cart'), { withCredentials: true })
      .then((res) => {
        // Discard response if user changed while request was in-flight
        if (requestSeqRef.current !== currentSeq) return;

        const serverItems = Array.isArray(res.data?.items) ? res.data.items : [];

        if (hadGuestMerge) {
          // If guest items were merged on login, push the combined state to the server
          axios
            .put(getApiUrl('/api/cart'), { items: initialUserItems }, { withCredentials: true })
            .catch(() => {});
        } else if (serverItems.length > 0) {
          setCart(serverItems);
          localStorage.setItem(userStorageKey, JSON.stringify(serverItems));
        } else if (cachedUserItems.length > 0) {
          // Sync local items to server if server was empty
          axios
            .put(getApiUrl('/api/cart'), { items: cachedUserItems }, { withCredentials: true })
            .catch(() => {});
        } else {
          setCart([]);
          localStorage.setItem(userStorageKey, JSON.stringify([]));
        }
      })
      .catch((err) => {
        if (requestSeqRef.current !== currentSeq) return;
        console.warn('[CART] Cloud cart sync unavailable, using isolated local state:', err.message);
      })
      .finally(() => {
        if (requestSeqRef.current === currentSeq) {
          setCartLoading(false);
        }
      });
  }, [user, authLoading]);

  // Persist helper for local and backend sync
  const persistCartUpdate = useCallback((updatedCart) => {
    const uid = activeUserIdRef.current;
    const storageKey = getUserKey(uid);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    } catch {
      // Storage quota or privacy mode error
    }

    if (uid) {
      axios
        .put(getApiUrl('/api/cart'), { items: updatedCart }, { withCredentials: true })
        .catch((err) => {
          console.warn('[CART] Failed to sync update to server:', err.message);
        });
    }
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    if (!product) return;
    const stock = product.countInStock !== undefined 
      ? Number(product.countInStock) 
      : Number(product.count_in_stock ?? 100);
    if (stock <= 0) {
      console.warn(`[CART] Refusing to add out-of-stock product "${product.name}" to cart.`);
      return;
    }

    setCart((prevCart) => {
      const pId = String(product.id || product._id);
      const existingIndex = prevCart.findIndex((item) => String(item.id || item._id) === pId);
      let updated;

      if (existingIndex > -1) {
        const currentStock = prevCart[existingIndex].countInStock !== undefined 
          ? Number(prevCart[existingIndex].countInStock)
          : Number(prevCart[existingIndex].count_in_stock ?? 100);
        const maxStock = currentStock > 0 ? currentStock : 100;
        updated = prevCart.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(maxStock, item.quantity + quantity) }
            : item
        );
      } else {
        updated = [...prevCart, { ...product, id: pId, _id: pId, quantity }];
      }

      persistCartUpdate(updated);
      return updated;
    });
  }, [persistCartUpdate]);

  const removeFromCart = useCallback((productId) => {
    setCart((prevCart) => {
      const pId = String(productId);
      const updated = prevCart.filter((item) => String(item.id) !== pId && String(item._id) !== pId);
      persistCartUpdate(updated);
      return updated;
    });
  }, [persistCartUpdate]);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity < 1) return;
    setCart((prevCart) => {
      const pId = String(productId);
      const updated = prevCart.map((item) =>
        String(item.id) === pId || String(item._id) === pId
          ? { ...item, quantity }
          : item
      );
      persistCartUpdate(updated);
      return updated;
    });
  }, [persistCartUpdate]);

  const clearCart = useCallback(() => {
    setCart([]);
    const uid = activeUserIdRef.current;
    const storageKey = getUserKey(uid);
    try {
      localStorage.setItem(storageKey, JSON.stringify([]));
    } catch {
      // Ignore
    }

    if (uid) {
      axios
        .delete(getApiUrl('/api/cart'), { withCredentials: true })
        .catch((err) => {
          console.warn('[CART] Failed to clear server cart:', err.message);
        });
    }
  }, []);

  const cartTotal = cart.reduce(
    (total, item) =>
      total + ((item.salePrice !== null && item.salePrice !== undefined) ? item.salePrice : item.price) * item.quantity,
    0
  );

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
