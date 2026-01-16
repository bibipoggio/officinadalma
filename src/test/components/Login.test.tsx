import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock auth functions
const mockSignIn = vi.fn();
const mockSignInWithGoogle = vi.fn();

// Mock useAuth
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signInWithGoogle: mockSignInWithGoogle,
    isLoading: false,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Import after mocks
import Login from "@/pages/Login";

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({ error: null });
  });

  describe("Rendering", () => {
    it("should render login form", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByText("Entrar")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Senha")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    });

    it("should render Google sign in button", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByRole("button", { name: /Continuar com Google/i })).toBeInTheDocument();
    });

    it("should render forgot password link", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByText("Esqueceu sua senha?")).toBeInTheDocument();
    });

    it("should render sign up link", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByText("Criar conta")).toBeInTheDocument();
    });

    it("should render logo", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByAltText("Officina da Alma")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should show error for empty email", async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email é obrigatório")).toBeInTheDocument();
      });
    });

    it("should show error for invalid email format", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "invalid-email");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email inválido")).toBeInTheDocument();
      });
    });

    it("should show error for empty password", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "valid@email.com");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Senha é obrigatória")).toBeInTheDocument();
      });
    });

    it("should show error for short password", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "valid@email.com");
      await user.type(passwordInput, "12345");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Senha deve ter no mínimo 6 caracteres")).toBeInTheDocument();
      });
    });

    it("should clear error when user starts typing", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email é obrigatório")).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "a");

      await waitFor(() => {
        expect(screen.queryByText("Email é obrigatório")).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should call signIn with valid credentials", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "test@email.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("test@email.com", "password123");
      });
    });

    it("should navigate to home on successful login", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "test@email.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });
    });

    it("should show error on failed login", async () => {
      mockSignIn.mockResolvedValue({ 
        error: { message: "Invalid login credentials" } 
      });

      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "test@email.com");
      await user.type(passwordInput, "wrongpassword");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email ou senha incorretos")).toBeInTheDocument();
      });
    });

    it("should show generic error for other errors", async () => {
      mockSignIn.mockResolvedValue({ 
        error: { message: "Network error" } 
      });

      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "test@email.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should disable form during submission", async () => {
      // Make signIn hang
      mockSignIn.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Senha");
      
      await user.type(emailInput, "test@email.com");
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Entrando...")).toBeInTheDocument();
      });
    });
  });

  describe("Google Sign In", () => {
    it("should call signInWithGoogle when Google button is clicked", async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const googleButton = screen.getByRole("button", { name: /Continuar com Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(mockSignInWithGoogle).toHaveBeenCalled();
      });
    });

    it("should show error on failed Google sign in", async () => {
      mockSignInWithGoogle.mockResolvedValue({ 
        error: { message: "Google error" } 
      });

      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const googleButton = screen.getByRole("button", { name: /Continuar com Google/i });
      fireEvent.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText("Erro ao entrar com Google. Tente novamente.")).toBeInTheDocument();
      });
    });
  });

  describe("Password Visibility Toggle", () => {
    it("should toggle password visibility", async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText("Senha");
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleButton = screen.getByLabelText("Mostrar senha");
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByLabelText("Ocultar senha")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Ocultar senha"));
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria attributes for email errors", async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText("Email");
        expect(emailInput).toHaveAttribute("aria-invalid", "true");
        expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
      });
    });

    it("should have role alert for error messages", async () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      const submitButton = screen.getByRole("button", { name: "Entrar" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText("Email é obrigatório");
        expect(errorMessage).toHaveAttribute("role", "alert");
      });
    });

    it("should have proper autocomplete attributes", () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      );

      expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
      expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password");
    });
  });
});

describe("Login Form Validation Logic", () => {
  it("should validate email format correctly", () => {
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    
    expect(isValidEmail("test@email.com")).toBe(true);
    expect(isValidEmail("user.name@domain.org")).toBe(true);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("@email.com")).toBe(false);
    expect(isValidEmail("test@")).toBe(false);
    expect(isValidEmail("test@.com")).toBe(false);
    expect(isValidEmail("test @email.com")).toBe(false);
  });

  it("should validate password length correctly", () => {
    const isValidPassword = (password: string) => password.length >= 6;
    
    expect(isValidPassword("123456")).toBe(true);
    expect(isValidPassword("password")).toBe(true);
    expect(isValidPassword("12345")).toBe(false);
    expect(isValidPassword("")).toBe(false);
  });
});
