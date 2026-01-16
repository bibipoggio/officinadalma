import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface FormErrors {
  displayName?: string;
  birthDate?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phone?: string;
  general?: string;
}

interface ProfileData {
  display_name: string | null;
  birth_date: string | null;
  birth_time: string | null;
  birth_city: string | null;
  birth_state: string | null;
  birth_country: string | null;
  phone: string | null;
}

const EditarPerfil = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthState, setBirthState] = useState("");
  const [birthCountry, setBirthCountry] = useState("");
  const [phone, setPhone] = useState("");

  // Format phone number as user types
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setPhone(formatted);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, birth_date, birth_time, birth_city, birth_state, birth_country, phone")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (data) {
          setDisplayName(data.display_name || "");
          setBirthDate(data.birth_date || "");
          setBirthTime(data.birth_time?.slice(0, 5) || ""); // Format HH:MM
          setBirthCity(data.birth_city || "");
          setBirthState(data.birth_state || "");
          setBirthCountry(data.birth_country || "Brasil");
          setPhone(data.phone ? formatPhone(data.phone) : "");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Erro ao carregar perfil");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!displayName.trim()) {
      newErrors.displayName = "Nome é obrigatório";
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = "Nome deve ter no mínimo 2 caracteres";
    }

    if (!birthDate) {
      newErrors.birthDate = "Data de nascimento é obrigatória";
    }

    if (!birthCity.trim()) {
      newErrors.birthCity = "Cidade de nascimento é obrigatória";
    }

    if (!birthState.trim()) {
      newErrors.birthState = "Estado é obrigatório";
    }

    if (!birthCountry.trim()) {
      newErrors.birthCountry = "País é obrigatório";
    }

    if (!phone.trim()) {
      newErrors.phone = "Telefone é obrigatório";
    } else if (phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Telefone inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          birth_date: birthDate,
          birth_time: birthTime || null,
          birth_city: birthCity.trim(),
          birth_state: birthState.trim(),
          birth_country: birthCountry.trim(),
          phone: phone.replace(/\D/g, ""),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
      navigate("/conta");
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrors({ general: "Erro ao atualizar perfil. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format birth date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

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
            Editar Perfil
          </h1>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
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

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome completo</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: undefined }));
                    }}
                    aria-invalid={!!errors.displayName}
                    disabled={isSubmitting}
                  />
                  {errors.displayName && (
                    <p className="text-sm text-destructive">{errors.displayName}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone para contato</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    aria-invalid={!!errors.phone}
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                {/* Birth Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de nascimento</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        setBirthDate(e.target.value);
                        if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: undefined }));
                      }}
                      aria-invalid={!!errors.birthDate}
                      disabled={isSubmitting}
                    />
                    {errors.birthDate && (
                      <p className="text-sm text-destructive">{errors.birthDate}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthTime">Hora (opcional)</Label>
                    <Input
                      id="birthTime"
                      type="time"
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Birth Location */}
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Local de nascimento
                  </Label>
                  
                  <div className="space-y-2">
                    <Label htmlFor="birthCity">Cidade</Label>
                    <Input
                      id="birthCity"
                      type="text"
                      placeholder="São Paulo"
                      value={birthCity}
                      onChange={(e) => {
                        setBirthCity(e.target.value);
                        if (errors.birthCity) setErrors((prev) => ({ ...prev, birthCity: undefined }));
                      }}
                      aria-invalid={!!errors.birthCity}
                      disabled={isSubmitting}
                    />
                    {errors.birthCity && (
                      <p className="text-sm text-destructive">{errors.birthCity}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="birthState">Estado</Label>
                      <Input
                        id="birthState"
                        type="text"
                        placeholder="SP"
                        value={birthState}
                        onChange={(e) => {
                          setBirthState(e.target.value);
                          if (errors.birthState) setErrors((prev) => ({ ...prev, birthState: undefined }));
                        }}
                        aria-invalid={!!errors.birthState}
                        disabled={isSubmitting}
                      />
                      {errors.birthState && (
                        <p className="text-sm text-destructive">{errors.birthState}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthCountry">País</Label>
                      <Input
                        id="birthCountry"
                        type="text"
                        placeholder="Brasil"
                        value={birthCountry}
                        onChange={(e) => {
                          setBirthCountry(e.target.value);
                          if (errors.birthCountry) setErrors((prev) => ({ ...prev, birthCountry: undefined }));
                        }}
                        aria-invalid={!!errors.birthCountry}
                        disabled={isSubmitting}
                      />
                      {errors.birthCountry && (
                        <p className="text-sm text-destructive">{errors.birthCountry}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Para alterar o email, use a opção "Alterar Email" na página da conta.
                  </p>
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
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default EditarPerfil;