import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle, Camera, User } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

interface FormErrors {
  displayName?: string;
  birthDate?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phone?: string;
  avatar?: string;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const displayNameRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLInputElement>(null);
  const birthCityRef = useRef<HTMLInputElement>(null);
  const birthStateRef = useRef<HTMLInputElement>(null);
  const birthCountryRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, avatar: "Por favor, selecione uma imagem" }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar: "A imagem deve ter no máximo 5MB" }));
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: undefined }));
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return avatarUrl;

    setIsUploadingAvatar(true);

    try {
      const fileExt = avatarFile.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setErrors((prev) => ({ ...prev, avatar: "Erro ao enviar imagem. Tente novamente." }));
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
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

    // Upload avatar if selected
    let finalAvatarUrl = avatarUrl;
    if (avatarFile) {
      finalAvatarUrl = await uploadAvatar();
      if (errors.avatar) {
        setIsSubmitting(false);
        return;
      }
    }

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
        avatar_url: finalAvatarUrl,
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
          {/* Avatar Upload */}
          <div className="relative mx-auto">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isSubmitting || isUploadingAvatar}
              className="w-24 h-24 rounded-full overflow-hidden shadow-lg ring-2 ring-crystal/30 hover:ring-primary/50 transition-all cursor-pointer group relative"
            >
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Foto de perfil" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={isSubmitting || isUploadingAvatar}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Clique para adicionar sua foto
          </p>
          {errors.avatar && (
            <p className="text-sm text-destructive" role="alert">
              {errors.avatar}
            </p>
          )}
          
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
            <Button type="submit" className="w-full" disabled={isSubmitting || isUploadingAvatar}>
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
