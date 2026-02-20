// context/CartContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "@/constants/api/axiosInstance";
import { useAuth } from "@/context/AuthContext";


interface CartContextType {
  totalItems: number;
  addToCart: (productId: string, variantId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string, variantId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  loading: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch cart count on mount / when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    } else {
      setTotalItems(0);
    }
  }, [isAuthenticated]);

  const refreshCart = async () => {
    try {
      const res = await axiosInstance.get("/api/cart");
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      console.log("Cart fetch error:", err);
    }
  };

  const addToCart = async (productId: string, variantId: string, quantity = 1) => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/api/cart/add", {
        productId,
        variantId,
        quantity,
      });
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      console.log("Add to cart error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId: string, variantId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.delete("/api/cart/remove", {
        data: { productId, variantId },
      });
      setTotalItems(res.data.totalItems ?? 0);
    } catch (err) {
      console.log("Remove from cart error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <CartContext.Provider value={{ totalItems, addToCart, removeFromCart, refreshCart, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
};