import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const Cadastro = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Focus first field on mount
  useEffect(() => {
    displayNameRef.current?.focus();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = "Nome é obrigatório";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "Nome deve ter no mínimo 2 caracteres";
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);

    // Focus first invalid field
    if (newErrors.displayName) {
      displayNameRef.current?.focus();
    } else if (newErrors.email) {
      emailRef.current?.focus();
    } else if (newErrors.password) {
      passwordRef.current?.focus();
    } else if (newErrors.confirmPassword) {
      confirmPasswordRef.current?.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const { error } = await signUp(email, password, displayName.trim());

    if (error) {
      let errorMessage = error.message;
      
      if (error.message.includes("already registered")) {
        errorMessage = "Este email já está cadastrado";
      }

      setErrors({ general: errorMessage });
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    
    // Redirect to home after success
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Background with image */}
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
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              Conta criada com sucesso!
            </h2>
            <p className="text-muted-foreground">
              Você será redirecionado automaticamente...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background with image */}
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
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-display">Criar Conta</CardTitle>
          <CardDescription>
            Junte-se à Oficina da Alma
          </CardDescription>
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

            {/* Display Name field */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome</Label>
              <Input
                ref={displayNameRef}
                id="displayName"
                type="text"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }));
                }}
                aria-invalid={!!errors.displayName}
                aria-describedby={errors.displayName ? "displayName-error" : undefined}
                autoComplete="name"
                disabled={isSubmitting}
              />
              {errors.displayName && (
                <p id="displayName-error" className="text-sm text-destructive" role="alert">
                  {errors.displayName}
                </p>
              )}
            </div>

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  autoComplete="new-password"
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

            {/* Confirm Password field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  ref={confirmPasswordRef}
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>

            {/* Login link */}
            <p className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link 
                to="/login" 
                className="text-primary hover:underline font-medium"
              >
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cadastro;
