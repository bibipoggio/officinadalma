import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserProfile {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_state: string | null;
  birth_country: string | null;
  phone: string | null;
  created_at: string;
}

interface SignUpProfileData {
  displayName?: string;
  birthDate?: string;
  birthTime?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  hasAdminAccess: boolean;
  signUp: (email: string, password: string, profileData?: SignUpProfileData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch role (get highest role)
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        setRole("user");
      } else if (rolesData && rolesData.length > 0) {
        // Priority: admin > moderator > user
        if (rolesData.some((r) => r.role === "admin")) {
          setRole("admin");
        } else if (rolesData.some((r) => r.role === "moderator")) {
          setRole("moderator");
        } else {
          setRole("user");
        }
      } else {
        setRole("user");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setRole("user");
    }
  };

  const clearUserData = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Defer data fetch to avoid blocking
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
        } else {
          clearUserData();
        }

        if (event === "SIGNED_OUT") {
          clearUserData();
        }

        setIsLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        fetchUserData(initialSession.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, profileData?: SignUpProfileData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: profileData?.displayName,
          },
        },
      });

      if (error) {
        return { error };
      }

      // If signup successful and we have user, update profile with additional data
      if (data.user && profileData) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: profileData.displayName || null,
            birth_date: profileData.birthDate || null,
            birth_time: profileData.birthTime || null,
            birth_city: profileData.birthCity || null,
            birth_state: profileData.birthState || null,
            birth_country: profileData.birthCountry || null,
            phone: profileData.phone || null,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    clearUserData();
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  const isAuthenticated = !!user && !!session;
  const isAdmin = role === "admin";
  const isModerator = role === "moderator";
  const hasAdminAccess = isAdmin || isModerator;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        isAuthenticated,
        isAdmin,
        isModerator,
        hasAdminAccess,
        signUp,
        signIn,
        signOut,
        refreshProfile,
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
