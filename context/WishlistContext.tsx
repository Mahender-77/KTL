// context/WishlistContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import axiosInstance from "@/constants/api/axiosInstance";
import { useAuth } from "@/context/AuthContext";

interface WishlistContextType {
  totalItems: number;
  productIds: string[];
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [totalItems, setTotalItems] = useState(0);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch wishlist count on mount / when user logs in
  useEffect(() => {
    if (isAuthenticated) {
      refreshWishlist();
    } else {
      setTotalItems(0);
      setProductIds([]);
    }
  }, [isAuthenticated]);

  const refreshWishlist = async () => {
    try {
      const res = await axiosInstance.get("/api/wishlist");
      const products = res.data.products || [];
      setTotalItems(products.length);
      // Handle both object format (with _id) and string format
      setProductIds(products.map((p: any) => (typeof p === 'string' ? p : p._id || p.toString())));
    } catch (err) {
      console.log("Wishlist fetch error:", err);
    }
  };

  const isInWishlist = (productId: string) => {
    return productIds.includes(productId);
  };

  const addToWishlist = async (productId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.post("/api/wishlist/add", {
        productId,
      });
      setTotalItems(res.data.totalItems ?? 0);
      setProductIds((prev) => [...prev, productId]);
    } catch (err: any) {
      console.log("Add to wishlist error:", err);
      // If product already in wishlist, just update the state
      if (err.response?.status === 400 && err.response?.data?.message?.includes("already")) {
        setProductIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      setLoading(true);
      const res = await axiosInstance.delete("/api/wishlist/remove", {
        data: { productId },
      });
      setTotalItems(res.data.totalItems ?? 0);
      setProductIds((prev) => prev.filter((id) => id !== productId));
    } catch (err) {
      console.log("Remove from wishlist error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{ totalItems, productIds, isInWishlist, addToWishlist, removeFromWishlist, refreshWishlist, loading }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
};

