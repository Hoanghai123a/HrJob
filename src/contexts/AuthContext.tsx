import React, { createContext, useContext, useEffect, useState } from "react";
import { pb } from "../lib/pocketbase";
import { UserProfile } from "../types";

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check
    if (pb.authStore.isValid) {
      setUser(pb.authStore.model);
      setProfile(pb.authStore.model as any);
    }
    setLoading(false);

    // Subscribe to auth state changes
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
      setProfile(model as any);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (username: string, pass: string) => {
    try {
      await pb.collection("users").authWithPassword(username, pass);
    } catch (error: any) {
      console.error("Login error:", error);
      const msg =
        error && error.message ? String(error.message) : String(error);
      if (
        msg
          .toLowerCase()
          .includes("not configured to allow password authentication")
      ) {
        throw new Error("COLLECTION_NOT_ALLOW_PASSWORD_AUTH");
      }
      throw error;
    }
  };

  const logout = async () => {
    pb.authStore.clear();
  };

  const refreshProfile = async () => {
    if (pb.authStore.isValid && pb.authStore.model) {
      try {
        const freshModel = await pb
          .collection("users")
          .getOne(pb.authStore.model.id);
        setUser(freshModel);
        setProfile(freshModel as any);
      } catch (error) {
        console.error("Error refreshing profile:", error);
      }
    }
  };

  const changePassword = async (newPass: string) => {
    if (pb.authStore.isValid && pb.authStore.model) {
      await pb.collection("users").update(pb.authStore.model.id, {
        password: newPass,
        passwordConfirm: newPass,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        logout,
        refreshProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
