import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";

// Mock AuthContext
const mockAuthContext: {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAdminAccess: boolean;
  profile: null | undefined | Record<string, unknown>;
  user: null;
  session: null;
  role: null | string;
  signUp: ReturnType<typeof vi.fn>;
  signIn: ReturnType<typeof vi.fn>;
  signInWithGoogle: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
  refreshProfile: ReturnType<typeof vi.fn>;
  isAdmin: boolean;
  isModerator: boolean;
} = {
  isAuthenticated: false,
  isLoading: false,
  hasAdminAccess: false,
  profile: undefined, // undefined = not loaded, null = loaded but doesn't exist
  user: null,
  session: null,
  role: null,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  refreshProfile: vi.fn(),
  isAdmin: false,
  isModerator: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuthContext,
}));

// Mock AppLayout
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

// Mock LoadingState
vi.mock("@/components/layout/PageState", () => ({
  LoadingState: ({ message }: { message: string }) => (
    <div data-testid="loading-state">{message}</div>
  ),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    // Reset mocks
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isLoading = false;
    mockAuthContext.hasAdminAccess = false;
    mockAuthContext.profile = undefined; // Reset to undefined
  });

  describe("Loading State", () => {
    it("should show loading state while checking auth", () => {
      mockAuthContext.isLoading = true;

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.getByText("Verificando autenticação...")).toBeInTheDocument();
    });

    it("should show loading state while profile is loading (undefined)", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.profile = undefined;

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.getByText("Carregando perfil...")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated User", () => {
    it("should redirect to login when not authenticated", () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.isLoading = false;

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  describe("Authenticated User with Complete Profile", () => {
    it("should render children when authenticated with complete profile", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.profile = {
        id: "user-123",
        birth_date: "1990-01-01",
        birth_city: "São Paulo",
        phone: "11999999999",
      };

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  describe("Authenticated User with Incomplete Profile", () => {
    it("should redirect to complete profile when profile is incomplete", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.profile = {
        id: "user-123",
        birth_date: null,
        birth_city: null,
        phone: null,
      };

      render(
        <MemoryRouter initialEntries={["/protected"]}>
          <Routes>
            <Route path="/completar-perfil" element={<div>Complete Profile Page</div>} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Complete Profile Page")).toBeInTheDocument();
    });

    it("should allow access to complete profile page with incomplete profile", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.profile = {
        id: "user-123",
        birth_date: null,
        birth_city: null,
        phone: null,
      };

      render(
        <MemoryRouter initialEntries={["/completar-perfil"]}>
          <Routes>
            <Route
              path="/completar-perfil"
              element={
                <ProtectedRoute>
                  <div>Complete Profile Form</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Complete Profile Form")).toBeInTheDocument();
    });
  });

  describe("Admin Routes", () => {
    it("should show access denied for non-admin on admin routes", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.hasAdminAccess = false;
      mockAuthContext.profile = {
        id: "user-123",
        birth_date: "1990-01-01",
        birth_city: "São Paulo",
        phone: "11999999999",
      };

      render(
        <MemoryRouter>
          <ProtectedRoute requireAdmin>
            <div>Admin Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Acesso Restrito")).toBeInTheDocument();
      expect(
        screen.getByText(/Você não tem permissão para acessar esta área/)
      ).toBeInTheDocument();
    });

    it("should allow admin access to admin routes", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.hasAdminAccess = true;
      mockAuthContext.profile = {
        id: "admin-123",
        birth_date: "1990-01-01",
        birth_city: "São Paulo",
        phone: "11999999999",
      };

      render(
        <MemoryRouter>
          <ProtectedRoute requireAdmin>
            <div>Admin Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    it("should allow moderator access to admin routes", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;
      mockAuthContext.hasAdminAccess = true; // Moderators have admin access
      mockAuthContext.role = "moderator";
      mockAuthContext.profile = {
        id: "mod-123",
        birth_date: "1990-01-01",
        birth_city: "São Paulo",
        phone: "11999999999",
      };

      render(
        <MemoryRouter>
          <ProtectedRoute requireAdmin>
            <div>Admin Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });
  });
});

describe("PublicOnlyRoute", () => {
  beforeEach(() => {
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isLoading = false;
  });

  describe("Loading State", () => {
    it("should show loading state while checking auth", () => {
      mockAuthContext.isLoading = true;

      render(
        <MemoryRouter>
          <PublicOnlyRoute>
            <div>Login Page</div>
          </PublicOnlyRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId("loading-state")).toBeInTheDocument();
      expect(screen.getByText("Carregando...")).toBeInTheDocument();
    });
  });

  describe("Unauthenticated User", () => {
    it("should render children for unauthenticated user", () => {
      mockAuthContext.isAuthenticated = false;
      mockAuthContext.isLoading = false;

      render(
        <MemoryRouter>
          <PublicOnlyRoute>
            <div>Login Page</div>
          </PublicOnlyRoute>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });

  describe("Authenticated User", () => {
    it("should redirect authenticated user to home", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;

      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <div>Login Page</div>
                </PublicOnlyRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    it("should redirect to previous page if available", () => {
      mockAuthContext.isAuthenticated = true;
      mockAuthContext.isLoading = false;

      render(
        <MemoryRouter
          initialEntries={[
            { pathname: "/login", state: { from: { pathname: "/diario" } } },
          ]}
        >
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/diario" element={<div>Diario Page</div>} />
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <div>Login Page</div>
                </PublicOnlyRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Diario Page")).toBeInTheDocument();
    });
  });
});

describe("Profile Completeness Check", () => {
  it("should consider profile complete with all required fields", () => {
    const profile = {
      birth_date: "1990-01-01",
      birth_city: "São Paulo",
      phone: "11999999999",
    };
    const isComplete = !!(profile.birth_date && profile.birth_city && profile.phone);
    expect(isComplete).toBe(true);
  });

  it("should consider profile incomplete without birth_date", () => {
    const profile = {
      birth_date: null,
      birth_city: "São Paulo",
      phone: "11999999999",
    };
    const isComplete = !!(profile.birth_date && profile.birth_city && profile.phone);
    expect(isComplete).toBe(false);
  });

  it("should consider profile incomplete without birth_city", () => {
    const profile = {
      birth_date: "1990-01-01",
      birth_city: null,
      phone: "11999999999",
    };
    const isComplete = !!(profile.birth_date && profile.birth_city && profile.phone);
    expect(isComplete).toBe(false);
  });

  it("should consider profile incomplete without phone", () => {
    const profile = {
      birth_date: "1990-01-01",
      birth_city: "São Paulo",
      phone: null,
    };
    const isComplete = !!(profile.birth_date && profile.birth_city && profile.phone);
    expect(isComplete).toBe(false);
  });

  it("should consider null profile as incomplete", () => {
    const profile = null;
    const isComplete = profile !== null && !!(profile.birth_date && profile.birth_city && profile.phone);
    expect(isComplete).toBe(false);
  });
});
