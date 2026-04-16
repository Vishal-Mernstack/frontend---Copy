import PropTypes from "prop-types";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import api from "../lib/api";
import useLocalStorage from "../hooks/useLocalStorage";
import { ROLE_LABELS } from "../utils/roles";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [storedUser, setStoredUser] = useLocalStorage("medicare_user", null);
  const [user, setUser] = useState(storedUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      const token = localStorage.getItem("medicare_token");
      if (!token) {
        // Auto-login as admin on startup
        try {
          const response = await api.post("/auth/login", {
            email: "admin@medicare.com",
            password: "Admin@123",
            expectedRole: "admin"
          });
          const authData = response.data?.data || response.data || {};
          localStorage.setItem("medicare_token", authData.token);
          if (authData.refreshToken) {
            localStorage.setItem("medicare_refresh_token", authData.refreshToken);
          }
          setStoredUser(authData.user || null);
          setUser(authData.user || null);
        } catch (error) {
          // Silent failure - continue to login page if auto-login fails
        }
        setIsLoading(false);
        return;
      }
      try {
        const response = await api.get("/auth/me");
        const authUser = response.data?.data?.user || response.data?.user || null;
        setUser(authUser);
        setStoredUser(authUser);
      } catch (error) {
        localStorage.removeItem("medicare_token");
        setUser(null);
        setStoredUser(null);
        // Silent failure - don't show toast for initial token verification
      } finally {
        setIsLoading(false);
      }
    };
    verify();
  }, [setStoredUser]);

  const login = async (payload) => {
    try {
      const response = await api.post("/auth/login", payload);
      const authData = response.data?.data || response.data || {};
      const expectedRole = payload?.expectedRole;
      const actualRole = authData.user?.role || null;

      if (expectedRole && actualRole && expectedRole !== actualRole) {
        return {
          success: false,
          message: `This account belongs to ${ROLE_LABELS[actualRole] || actualRole}, not ${ROLE_LABELS[expectedRole] || expectedRole}.`,
        };
      }

      localStorage.setItem("medicare_token", authData.token);
      if (authData.refreshToken) {
        localStorage.setItem("medicare_refresh_token", authData.refreshToken);
      }
      setStoredUser(authData.user || null);
      setUser(authData.user || null);
      toast.success("Login successful");
      return { success: true, user: authData.user || null };
    } catch (error) {
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };

  const register = async (payload) => {
    try {
      const response = await api.post("/auth/register", payload);
      const authData = response.data?.data || response.data || {};
      localStorage.setItem("medicare_token", authData.token);
      if (authData.refreshToken) {
        localStorage.setItem("medicare_refresh_token", authData.refreshToken);
      }
      setStoredUser(authData.user || null);
      setUser(authData.user || null);
      toast.success("Account created");
      return { success: true, user: authData.user || null };
    } catch (error) {
      toast.error(error.message);
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("medicare_token");
    localStorage.removeItem("medicare_refresh_token");
    setStoredUser(null);
    setUser(null);
    toast.success("Logged out");
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
