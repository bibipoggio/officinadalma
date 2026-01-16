import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import logoOfficina from "@/assets/logo_officina.jpg";
interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

const Login = () => {
  const { signIn, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Focus first field on mount
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email inválido";
    }

    if (!password) {
      newErrors.password = "Senha é obrigatória";
    } else if (password.length < 6) {
      newErrors.password = "Senha deve ter no mínimo 6 caracteres";
    }

    setErrors(newErrors);

    // Focus first invalid field
    if (newErrors.email) {
      emailRef.current?.focus();
    } else if (newErrors.password) {
      passwordRef.current?.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const { error } = await signIn(email, password);

    if (error) {
      setErrors({
        general: error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
      });
      setIsSubmitting(false);
      return;
    }

    // Navigate to previous page or home
    const from = (location.state as { from?: Location })?.from?.pathname || "/";
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background with logo */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Overlay for better contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/50 to-background/70" />
      
      <Card className="w-full max-w-md shadow-card relative z-10 bg-card/95 backdrop-blur-md border-crystal/20">
        <CardHeader className="text-center space-y-4 pt-8">
          {/* Logo */}
          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden shadow-lg ring-2 ring-crystal/30">
            <img 
              src={logoOfficina} 
              alt="Officina da Alma" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-display">Entrar</CardTitle>
            <CardDescription>
              Entre na sua conta para continuar
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* General error */}
            {errors.general && (
              <div 
                className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                role="alert"
                aria-live="polite"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="text-center">
              <Link 
                to="/recuperar-senha" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            {/* Sign up link */}
            <p className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link 
                to="/cadastro" 
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
