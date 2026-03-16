import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { getApiConfig } from "@/lib/config";
import { encryptPassword } from "@/lib/encryptPassword";

interface MenuDetails {
  logo: string;
  menus: {
    NAV: Array<any>; // Define more precise types if possible
    SECTION: Array<any>;
  };
  
}

export interface User {
  id: number;
  username: string;
  accessToken: string;
  tokenType: string;
  role?: string;
   firstName?: string; // <-- add this
  lastName?: string;  // <-- add this
  menuDetails?: MenuDetails;
  // Add more fields as needed
}

const USER_STORAGE_KEY = "azam-user";
const TOKEN_STORAGE_KEY = "azam-access-token";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const { baseUrl } = getApiConfig();
      const encryptedPassword = encryptPassword(password);

      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: encryptedPassword }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();

      if (
        result.status === "SUCCESS" &&
        result.data &&
        result.data.accessToken
      ) {
        const userData: User = {
          username: result.data.username,
          accessToken: result.data.accessToken,
          tokenType: result.data.tokenType,
          id: 0
        };

        // Store in memory and localStorage
        setUser(userData);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        localStorage.setItem(TOKEN_STORAGE_KEY, userData.accessToken);

        // Redirect to dashboard
        setLocation("/dashboard");
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    // Optionally, clear all localStorage/sessionStorage if needed
    setLocation("/login");
  };

  // Get access token for API requests
  const getAccessToken = () => {
    return user?.accessToken || localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getAccessToken,
  };
}