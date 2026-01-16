import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2, Eye, EyeOff, CheckCircle, KeyRound } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import logoOfficina from "@/assets/logo_officina.jpg";

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const RedefinirSenha = () => {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  // Check if user has a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // User should have a session from the recovery link
      if (session) {
        setIsValidSession(true);
      }
      setIsLoading(false);
    };

    // Listen for auth state changes (recovery link sets a session)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsLoading(false);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!password) {
      newErrors.password = "Nova senha é obrigatória";
    } else if (password.length < 6) {
      newErrors.password = "A senha deve ter no mínimo 6 caracteres";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setErrors({ general: error.message });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);

      // Redirect to home after success
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2500);
    } catch (err) {
      console.error("Error resetting password:", err);
      setErrors({ general: "Erro ao redefinir senha. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/50 to-background/70" />
        
        <Card className="w-full max-w-md shadow-card relative z-10 bg-card/95 backdrop-blur-md border-crystal/20">
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid session - no recovery token
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/50 to-background/70" />
        
        <Card className="w-full max-w-md shadow-card relative z-10 bg-card/95 backdrop-blur-md border-crystal/20">
          <CardHeader className="text-center space-y-4 pt-8">
            <div className="w-20 h-20 mx-auto rounded-full overflow-hidden shadow-lg ring-2 ring-crystal/30">
              <img 
                src={logoOfficina} 
                alt="Officina da Alma" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-display">Link Inválido</CardTitle>
              <CardDescription>
                Este link de recuperação expirou ou é inválido.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Solicite um novo link de recuperação de senha.
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate("/recuperar-senha")}
            >
              Solicitar Novo Link
            </Button>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate("/login")}
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />
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
          
          {isSuccess ? (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <CardTitle className="text-2xl font-display">Senha Redefinida!</CardTitle>
              <CardDescription className="text-base">
                Sua senha foi alterada com sucesso.
              </CardDescription>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display">Nova Senha</CardTitle>
              <CardDescription>
                Digite sua nova senha
              </CardDescription>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Você será redirecionado automaticamente...
              </p>
              <Button 
                className="w-full" 
                onClick={() => navigate("/", { replace: true })}
              >
                Ir para o Início
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* General error */}
              {errors.general && (
                <div 
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={!!errors.password}
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
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                    }}
                    aria-invalid={!!errors.confirmPassword}
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
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit button */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redefinindo...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedefinirSenha;