// src/context/AuthProvider.tsx

import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

// This interface defines the shape of the user data OBJECT the client will receive and store.
// It correctly omits `accessToken`.

export interface MenuSection {
  menuType: "SECTION";
  pageSectionName: string | null;
  pageMenu: string;
  pageMenuLabel: string | null;
  pageMenuIcon: string;
  pageUrl: string;
  pageMenuOrder: number;
  subMenus: any[];
}

export interface NavMenu {
  menuType: "NAV";
  pageSectionName: string | null;
  pageMenu: string;
  pageMenuLabel: string | null;
  pageMenuIcon: string;
  pageUrl: string;
  pageMenuOrder: number;
  subMenus: any[];
}

export interface User {
  username: string;
  country?: string;
  tokenType?: string;
  sapBpId?: string | null;
  salesOrg?: string;
  sapCaId?: string | null;
  parentSapBpId?: string | null;
  checkerAccess?: "Y" | "N";
  allAccess?: "Y" | "N";
  isMainPlant?: "Y" | "N" | null;
  isOtc?: "Y" | "N" | null;
  isEmployee?: "Y" | "N";
  name?: string;
  email?: string;
  phone?: string;
  onbId?: string;
  menuDetails?: {
    logo: string;
    menus: {
      NAV: NavMenu[];
      SECTION: MenuSection[];
    };
  };
}
type LoginResult = { success: boolean; message?: string };
const USER_PROFILE_STORAGE_KEY = "azam-user-profile";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<LoginResult>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);

  useEffect(() => {
    try {
      // MODIFIED: Check LocalStorage (Remember Me) OR SessionStorage (One-time)
      const storedUserProfile =
        localStorage.getItem(USER_PROFILE_STORAGE_KEY) ||
        sessionStorage.getItem(USER_PROFILE_STORAGE_KEY);

      if (storedUserProfile) {
        setUser(JSON.parse(storedUserProfile));
      }
    } catch (e) {

      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isExpiryModalOpen) setIsExpiryModalOpen(true);
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [isExpiryModalOpen]);

  const login = async (username: string, password: string, rememberMe: boolean): Promise<LoginResult> => {
    try {
      const result = await apiRequest(
        `/auth/login`,
        "POST",
        { username, password, rememberMe }
      );

      // If SUCCESS
      if (result.status === "SUCCESS" && result.data) {
        const userDataFromBff: User = result.data;
        setUser(userDataFromBff);

        if (rememberMe) {
          localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userDataFromBff));
          sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        } else {
          sessionStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(userDataFromBff));
          localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        }

        setLocation("/dashboard");
        return { success: true };
      }

      // If FAILURE (e.g. 401 captured by BFF and returned as 200 with status: FAILURE)
      return {
        success: false,
        message: result.statusMessage // Return the actual API message
      };

    } catch (error: any) {

      // If a network error or other exception occurred
      return {
        success: false,
        message: error.message || "An unexpected error occurred"
      };
    }
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', 'POST');
    } catch (error) {

    } finally {
      setUser(null);
      // MODIFIED: Clear BOTH storages on logout
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      setIsExpiryModalOpen(false);
      setLocation("/login");
    }
  };

  const isAdmin = user?.allAccess === "Y";

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isAdmin, login, logout }}>
      {children}
      <Dialog open={isExpiryModalOpen} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-red-600">Session Expired</DialogTitle>
            <DialogDescription className="pt-2">
              Your session has expired. Please log in again to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              onClick={logout}
              className="w-full"
            >
              Login Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}