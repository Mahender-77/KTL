import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "@/constants/api/axiosInstance";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");

      if (token) {
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        setIsAuthenticated(true);
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
  };

  const logout = async () => {
    await AsyncStorage.removeItem("accessToken");
    delete axiosInstance.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, register, logout, loading }}
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
