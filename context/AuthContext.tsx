import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from "@/constants/api/axiosInstance";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LAST_ACTIVITY_KEY = "authLastActivityAt";
/** Token expires after 3 days of no app use (no successful authenticated requests) */
const INACTIVITY_MS = 3 * 24 * 60 * 60 * 1000;

function isTokenExpiredByInactivity(lastActivityAt: number | null): boolean {
  if (lastActivityAt == null) return true;
  return Date.now() - lastActivityAt > INACTIVITY_MS;
}

async function touchSession(): Promise<void> {
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    name: string;
    email: string;
    role?: string;
    organizationId?: string | null;
    isSuperAdmin?: boolean;
  } | null;
  modules: string[];
  permissions: string[];
  productFields: Record<string, boolean>;
  hasModule: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [productFields, setProductFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Try to exchange refresh token for a new access token
  const refreshTokens = async (): Promise<string | null> => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;
    try {
      const res = await axiosInstance.post("/api/auth/refresh", { refreshToken });
      const newAccess = res.data.accessToken as string;
      const newRefresh = res.data.refreshToken as string;
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, newAccess);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      await touchSession();
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
      setIsAuthenticated(true);
      return newAccess;
    } catch (err) {
      console.log("Token refresh failed:", err);
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
      delete axiosInstance.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
      setUser(null);
      setModules([]);
      setPermissions([]);
      setProductFields({});
      return null;
    }
  };

  const fetchUserInfo = async () => {
    try {
      const response = await axiosInstance.get("/api/auth/me");
      setUser(response.data?.user ?? null);
      setModules(Array.isArray(response.data?.organization?.modules) ? response.data.organization.modules : []);
      setPermissions(Array.isArray(response.data?.permissions) ? response.data.permissions : []);
      setProductFields(response.data?.productFields ?? {});
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      console.log("Failed to fetch user info:", error);
      setUser(null);
      setModules([]);
      setPermissions([]);
      setProductFields({});
      // 401/404 = invalid or expired token or user gone → clear session so user can log in again
      if (status === 401 || status === 404) {
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
        await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
        delete axiosInstance.defaults.headers.common["Authorization"];
        setIsAuthenticated(false);
      }
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (token) {
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        setIsAuthenticated(true);
        await fetchUserInfo();
      } else if (refreshToken) {
        const newAccess = await refreshTokens();
        if (newAccess) {
          await fetchUserInfo();
        }
      }

      setLoading(false);
    };

    checkToken();
  }, []);

  // Global axios interceptor: auto-refresh on token expiry while app is active
  useEffect(() => {
    const id = axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status;
        const errorCode = error?.response?.data?.errorCode;
        const originalRequest = error.config;

        if (
          status === 401 &&
          errorCode === "TOKEN_EXPIRED" &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          const newAccess = await refreshTokens();
          if (newAccess) {
            originalRequest.headers = {
              ...(originalRequest.headers || {}),
              Authorization: `Bearer ${newAccess}`,
            };
            return axiosInstance(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(id);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });

    const token = response.data.accessToken as string;
    const refreshToken = response.data.refreshToken as string;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await touchSession();

    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
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

    const token = response.data.accessToken as string;
    const refreshToken = response.data.refreshToken as string;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    await touchSession();

    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setIsAuthenticated(true);
    await fetchUserInfo();
  };

  const logout = async () => {
    await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    delete axiosInstance.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
    setModules([]);
    setPermissions([]);
    setProductFields({});
  };

  const hasModule = (module: string): boolean => {
    return modules.includes(module);
  };

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes("*")) return true;
    if (permissions.includes(permission)) return true;
    const mod = permission.split(".")[0];
    if (!mod) return false;
    return permissions.includes(`${mod}.*`) || permissions.includes(mod);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        modules,
        permissions,
        productFields,
        hasModule,
        hasPermission,
        login,
        register,
        logout,
        loading,
      }}
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
