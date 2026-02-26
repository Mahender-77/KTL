import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "@/constants/api/axiosInstance";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserInfo = async () => {
    try {
      const response = await axiosInstance.get("/api/auth/me");
      setUser({
        name: response.data.name,
        email: response.data.email,
      });
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.log("Failed to fetch user info:", error);
      setUser(null);
      // 401/404 = invalid or expired token or user gone → clear session so user can log in again
      if (status === 401 || status === 404) {
        await AsyncStorage.removeItem("accessToken");
        delete axiosInstance.defaults.headers.common["Authorization"];
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");

      if (token) {
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        setIsAuthenticated(true);
        await fetchUserInfo();
      }

      setLoading(false);
    };

    checkToken();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });

    const token = response.data.accessToken;

    await AsyncStorage.setItem("accessToken", token);

    axiosInstance.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${token}`;

    setIsAuthenticated(true);
    await fetchUserInfo();
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ) => {
    const response = await axiosInstance.post("/api/auth/register", {
      name,
      email,
      password,
    });

    const token = response.data.accessToken;

    await AsyncStorage.setItem("accessToken", token);

    axiosInstance.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${token}`;

    setIsAuthenticated(true);
    setUser({ name, email });
  };

  const logout = async () => {
    await AsyncStorage.removeItem("accessToken");
    delete axiosInstance.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
