import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import axiosInstance from "@/constants/api/axiosInstance";
import {
  migrateLegacyTokensOnce,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  removeAccessToken,
  removeLastActivity,
  touchLastActivity,
  clearSessionTokens,
} from "@/constants/authTokenStorage";
import {
  requestPermission,
  getPushToken,
  persistPushRegistrationToken,
  getPersistedPushRegistrationToken,
  clearPersistedPushRegistrationToken,
} from "@/services/pushNotifications";

export type AuthUser = {
  name: string;
  email: string;
  role?: string;
  organizationId?: string | null;
  isSuperAdmin?: boolean;
};

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  modules: string[];
  permissions: string[];
  productFields: Record<string, boolean>;
  hasModule: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (name: string, email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapPushPlatform(): "ios" | "android" | "web" {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [productFields, setProductFields] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const pushTokenRef = useRef<string | null>(null);

  const syncPushRegistration = async () => {
    if (Platform.OS === "web") return;
    const perm = await requestPermission();
    if (perm !== "granted") return;
    const expoToken = await getPushToken();
    if (!expoToken) return;
    if (__DEV__) {
      console.info("[push] Expo push token:", expoToken);
    }
    try {
      await axiosInstance.post("/api/push/token", {
        token: expoToken,
        platform: mapPushPlatform(),
      });
      pushTokenRef.current = expoToken;
      await persistPushRegistrationToken(expoToken);
    } catch {
      /* registration is best-effort */
    }
  };

  const unregisterPushOnServer = async () => {
    if (Platform.OS === "web") return;
    const tok = pushTokenRef.current ?? (await getPersistedPushRegistrationToken());
    if (!tok) return;
    try {
      await axiosInstance.delete("/api/push/token", { data: { token: tok } });
    } catch {
      /* best-effort */
    }
    pushTokenRef.current = null;
    await clearPersistedPushRegistrationToken();
  };

  const refreshTokens = async (): Promise<string | null> => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await axiosInstance.post("/api/auth/refresh", { refreshToken });
      const newAccess = res.data.accessToken as string;
      const newRefresh = res.data.refreshToken as string;
      await setAccessToken(newAccess);
      await setRefreshToken(newRefresh);
      await touchLastActivity();
      axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccess}`;
      setIsAuthenticated(true);
      return newAccess;
    } catch {
      await clearSessionTokens();
      delete axiosInstance.defaults.headers.common["Authorization"];
      setIsAuthenticated(false);
      setUser(null);
      setModules([]);
      setPermissions([]);
      setProductFields({});
      return null;
    }
  };

  const fetchUserInfo = async (): Promise<AuthUser | null> => {
    try {
      const response = await axiosInstance.get("/api/auth/me");
      const u = (response.data?.user ?? null) as AuthUser | null;
      setUser(u);
      setModules(Array.isArray(response.data?.organization?.modules) ? response.data.organization.modules : []);
      setPermissions(Array.isArray(response.data?.permissions) ? response.data.permissions : []);
      setProductFields(response.data?.productFields ?? {});
      return u;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      setUser(null);
      setModules([]);
      setPermissions([]);
      setProductFields({});
      if (status === 401 || status === 404) {
        await removeAccessToken();
        await removeLastActivity();
        delete axiosInstance.defaults.headers.common["Authorization"];
        setIsAuthenticated(false);
      }
      return null;
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      await migrateLegacyTokensOnce();

      const token = await getAccessToken();
      const refreshTok = await getRefreshToken();

      if (token) {
        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        setIsAuthenticated(true);
        await fetchUserInfo();
        await syncPushRegistration();
      } else if (refreshTok) {
        const newAccess = await refreshTokens();
        if (newAccess) {
          await fetchUserInfo();
          await syncPushRegistration();
        }
      }

      setLoading(false);
    };

    checkToken();
  }, []);

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

  const login = async (email: string, password: string): Promise<AuthUser | null> => {
    const response = await axiosInstance.post("/api/auth/login", {
      email,
      password,
    });

    const token = response.data.accessToken as string;
    const refreshToken = response.data.refreshToken as string;
    await setAccessToken(token);
    await setRefreshToken(refreshToken);
    await touchLastActivity();

    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setIsAuthenticated(true);
    const u = await fetchUserInfo();
    await syncPushRegistration();
    return u;
  };

  const register = async (name: string, email: string, password: string): Promise<AuthUser | null> => {
    const response = await axiosInstance.post("/api/auth/register", {
      name,
      email,
      password,
    });

    const token = response.data.accessToken as string;
    const refreshToken = response.data.refreshToken as string;
    await setAccessToken(token);
    await setRefreshToken(refreshToken);
    await touchLastActivity();

    axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setIsAuthenticated(true);
    const u = await fetchUserInfo();
    await syncPushRegistration();
    return u;
  };

  const logout = async () => {
    await unregisterPushOnServer();
    await clearSessionTokens();
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
