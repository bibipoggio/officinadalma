import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import logoOfficina from "@/assets/logo_officina.jpg";

interface FormErrors {
  displayName?: string;
  birthDate?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phone?: string;
  general?: string;
}

const CompletarPerfil = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthState, setBirthState] = useState("");
  const [birthCountry, setBirthCountry] = useState("Brasil");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const displayNameRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const birthCityRef = useRef<HTMLInputElement>(null);
  const birthStateRef = useRef<HTMLInputElement>(null);
  const birthCountryRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Pre-fill with existing profile data
  useEffect(() => {
    if (profile) {
      if (profile.display_name) setDisplayName(profile.display_name);
      if (profile.birth_date) setBirthDate(profile.birth_date);
      if (profile.birth_time) setBirthTime(profile.birth_time);
      if (profile.birth_city) setBirthCity(profile.birth_city);
      if (profile.birth_state) setBirthState(profile.birth_state);
      if (profile.birth_country) setBirthCountry(profile.birth_country);
      if (profile.phone) setPhone(formatPhone(profile.phone));
    }
  }, [profile]);

  // Focus first empty required field on mount
  useEffect(() => {
    if (!displayName) {
      displayNameRef.current?.focus();
    } else if (!birthDate) {
      birthDateRef.current?.focus();
    } else if (!birthCity) {
      birthCityRef.current?.focus();
    }
  }, []);

  // Format phone number as user types
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

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

    // Focus first invalid field
    if (newErrors.displayName) {
      displayNameRef.current?.focus();
    } else if (newErrors.birthDate) {
      birthDateRef.current?.focus();
    } else if (newErrors.birthCity) {
      birthCityRef.current?.focus();
    } else if (newErrors.birthState) {
      birthStateRef.current?.focus();
    } else if (newErrors.birthCountry) {
      birthCountryRef.current?.focus();
    } else if (newErrors.phone) {
      phoneRef.current?.focus();
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !user) return;

    setIsSubmitting(true);
    setErrors({});

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

    if (error) {
      setErrors({ general: "Erro ao salvar perfil. Tente novamente." });
      setIsSubmitting(false);
      return;
    }

    await refreshProfile();
    setIsSuccess(true);

    // Redirect to home after success
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 1500);
  };

  if (isSuccess) {
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
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-display font-semibold text-foreground">
              Perfil completo!
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
      
      <Card className="w-full max-w-md shadow-card relative z-10 bg-card/95 backdrop-blur-md border-crystal/20 max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="w-20 h-20 mx-auto rounded-full overflow-hidden shadow-lg ring-2 ring-crystal/30">
            <img 
              src={logoOfficina} 
              alt="Officina da Alma" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-display">Complete seu Perfil</CardTitle>
            <CardDescription>
              Precisamos de algumas informações para personalizar sua experiência
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              <Label htmlFor="displayName">Nome completo</Label>
              <Input
                ref={displayNameRef}
                id="displayName"
                type="text"
                placeholder="Seu nome completo"
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

            {/* Phone field */}
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone para contato</Label>
              <Input
                ref={phoneRef}
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                autoComplete="tel"
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-destructive" role="alert">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Birth Date and Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input
                  ref={birthDateRef}
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: undefined }));
                  }}
                  aria-invalid={!!errors.birthDate}
                  aria-describedby={errors.birthDate ? "birthDate-error" : undefined}
                  disabled={isSubmitting}
                />
                {errors.birthDate && (
                  <p id="birthDate-error" className="text-sm text-destructive" role="alert">
                    {errors.birthDate}
                  </p>
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
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Local de nascimento</Label>
              
              <div className="space-y-2">
                <Label htmlFor="birthCity">Cidade</Label>
                <Input
                  ref={birthCityRef}
                  id="birthCity"
                  type="text"
                  placeholder="São Paulo"
                  value={birthCity}
                  onChange={(e) => {
                    setBirthCity(e.target.value);
                    if (errors.birthCity) setErrors((prev) => ({ ...prev, birthCity: undefined }));
                  }}
                  aria-invalid={!!errors.birthCity}
                  aria-describedby={errors.birthCity ? "birthCity-error" : undefined}
                  disabled={isSubmitting}
                />
                {errors.birthCity && (
                  <p id="birthCity-error" className="text-sm text-destructive" role="alert">
                    {errors.birthCity}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="birthState">Estado</Label>
                  <Input
                    ref={birthStateRef}
                    id="birthState"
                    type="text"
                    placeholder="SP"
                    value={birthState}
                    onChange={(e) => {
                      setBirthState(e.target.value);
                      if (errors.birthState) setErrors((prev) => ({ ...prev, birthState: undefined }));
                    }}
                    aria-invalid={!!errors.birthState}
                    aria-describedby={errors.birthState ? "birthState-error" : undefined}
                    disabled={isSubmitting}
                  />
                  {errors.birthState && (
                    <p id="birthState-error" className="text-sm text-destructive" role="alert">
                      {errors.birthState}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthCountry">País</Label>
                  <Input
                    ref={birthCountryRef}
                    id="birthCountry"
                    type="text"
                    placeholder="Brasil"
                    value={birthCountry}
                    onChange={(e) => {
                      setBirthCountry(e.target.value);
                      if (errors.birthCountry) setErrors((prev) => ({ ...prev, birthCountry: undefined }));
                    }}
                    aria-invalid={!!errors.birthCountry}
                    aria-describedby={errors.birthCountry ? "birthCountry-error" : undefined}
                    disabled={isSubmitting}
                  />
                  {errors.birthCountry && (
                    <p id="birthCountry-error" className="text-sm text-destructive" role="alert">
                      {errors.birthCountry}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar e Continuar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletarPerfil;
