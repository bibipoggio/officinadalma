import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import logoOfficina from "@/assets/logo_officina.jpg";

const RecuperarSenha = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email é obrigatório");
      return;
    }

    if (!validateEmail(email)) {
      setError("Email inválido");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) {
        setError(resetError.message);
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Error sending reset email:", err);
      setError("Erro ao enviar email. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <CardTitle className="text-2xl font-display">Email Enviado!</CardTitle>
              <CardDescription className="text-base">
                Enviamos um link de recuperação para <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </div>
          ) : (
            <div className="space-y-1">
              <CardTitle className="text-2xl font-display">Recuperar Senha</CardTitle>
              <CardDescription>
                Digite seu email para receber o link de recuperação
              </CardDescription>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>Verifique sua caixa de entrada e siga as instruções do email.</p>
                <p>Se não encontrar, verifique a pasta de spam.</p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail("");
                  }}
                >
                  Enviar para outro email
                </Button>
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Error */}
              {error && (
                <div 
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={!!error}
                    autoComplete="email"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Submit button */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Link de Recuperação"
                )}
              </Button>

              {/* Back to login */}
              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarSenha;