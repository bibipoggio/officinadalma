import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

const AlterarSenha = () => {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "A nova senha deve ter no mínimo 6 caracteres";
    } else if (newPassword === currentPassword) {
      newErrors.newPassword = "A nova senha deve ser diferente da atual";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (newPassword !== confirmPassword) {
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
      // First, verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setErrors({ general: "Erro ao verificar usuário. Tente novamente." });
        setIsSubmitting(false);
        return;
      }

      // Try to sign in with current password to verify it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        setErrors({ currentPassword: "Senha atual incorreta" });
        setIsSubmitting(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setErrors({ general: updateError.message });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      toast.success("Senha alterada com sucesso!");

      // Redirect after success
      setTimeout(() => {
        navigate("/conta");
      }, 2000);
    } catch (error) {
      console.error("Error changing password:", error);
      setErrors({ general: "Erro ao alterar senha. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <AppLayout>
        <div className="space-y-6 max-w-lg mx-auto">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Senha alterada com sucesso!
              </h2>
              <p className="text-muted-foreground">
                Você será redirecionado automaticamente...
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-lg mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/conta")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Alterar Senha
          </h1>
        </header>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha atual</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Digite sua senha atual"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                    }}
                    aria-invalid={!!errors.currentPassword}
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showCurrentPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                    }}
                    aria-invalid={!!errors.newPassword}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite a nova senha novamente"
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

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/conta")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar Senha"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security tips */}
        <div className="text-sm text-muted-foreground space-y-2 px-1">
          <p className="font-medium">Dicas para uma senha segura:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Use pelo menos 6 caracteres</li>
            <li>Combine letras maiúsculas e minúsculas</li>
            <li>Inclua números e símbolos especiais</li>
            <li>Evite informações pessoais óbvias</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
};

export default AlterarSenha;