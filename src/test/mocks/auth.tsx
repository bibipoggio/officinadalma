import React, { createContext, useContext } from "react";

// Types matching AuthContext
export type AppRole = "user" | "moderator" | "admin";

export interface MockUser {
  id: string;
  email?: string;
}

export interface MockAuthContextValue {
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: AppRole | null;
  hasAdminAccess: boolean;
  profile: any;
}

const defaultMockValue: MockAuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  role: null,
  hasAdminAccess: false,
  profile: null,
};

const MockAuthContext = createContext<MockAuthContextValue>(defaultMockValue);

interface MockAuthProviderProps {
  children: React.ReactNode;
  value?: Partial<MockAuthContextValue>;
}

export function MockAuthProvider({ children, value = {} }: MockAuthProviderProps) {
  const contextValue = { ...defaultMockValue, ...value };
  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuth() {
  return useContext(MockAuthContext);
}

// Helper to create authenticated user context
export const createAuthenticatedUser = (
  id: string = "user-123",
  role: AppRole = "user"
): Partial<MockAuthContextValue> => ({
  user: { id, email: `${id}@test.com` },
  isAuthenticated: true,
  isLoading: false,
  role,
  hasAdminAccess: role === "admin" || role === "moderator",
  profile: {
    id,
    display_name: "Test User",
    birth_date: "1990-01-01",
    birth_city: "São Paulo",
    phone: "11999999999",
  },
});

// Helper to create unauthenticated context
export const createUnauthenticatedUser = (): Partial<MockAuthContextValue> => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  role: null,
  hasAdminAccess: false,
  profile: null,
});

// Helper for loading state
export const createLoadingState = (): Partial<MockAuthContextValue> => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  role: null,
  hasAdminAccess: false,
  profile: null,
});
