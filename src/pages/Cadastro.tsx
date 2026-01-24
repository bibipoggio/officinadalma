import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BirthDateInput } from "@/components/ui/BirthDateInput";
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import logoOfficina from "@/assets/logo_officina.jpg";

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  birthDate?: string;
  birthCity?: string;
  birthState?: string;
  birthCountry?: string;
  phone?: string;
  general?: string;
}

const Cadastro = () => {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthCity, setBirthCity] = useState("");
  const [birthState, setBirthState] = useState("");
  const [birthCountry, setBirthCountry] = useState("Brasil");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const birthDateRef = useRef<HTMLButtonElement>(null);
  const birthCityRef = useRef<HTMLInputElement>(null);
  const birthStateRef = useRef<HTMLInputElement>(null);
  const birthCountryRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Focus first field on mount
  useEffect(() => {
    displayNameRef.current?.focus();
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
    } else if (newErrors.email) {
      emailRef.current?.focus();
    } else if (newErrors.phone) {
      phoneRef.current?.focus();
    } else if (newErrors.birthDate) {
      birthDateRef.current?.focus();
    } else if (newErrors.birthCity) {
      birthCityRef.current?.focus();
    } else if (newErrors.birthState) {
      birthStateRef.current?.focus();
    } else if (newErrors.birthCountry) {
      birthCountryRef.current?.focus();
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

    const { error } = await signUp(email, password, {
      displayName: displayName.trim(),
      birthDate,
      birthTime: birthTime || undefined,
      birthCity: birthCity.trim(),
      birthState: birthState.trim(),
      birthCountry: birthCountry.trim(),
      phone: phone.replace(/\D/g, ""),
    });

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

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrors({});

    const { error } = await signInWithGoogle();

    if (error) {
      setErrors({
        general: "Erro ao criar conta com Google. Tente novamente.",
      });
      setIsSubmitting(false);
    }
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
      
      <Card className="w-full max-w-md shadow-card relative z-10 bg-card/95 backdrop-blur-md border-crystal/20 max-h-[90vh] overflow-y-auto">
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
            <CardTitle className="text-2xl font-display">Criar Conta</CardTitle>
            <CardDescription>
              Junte-se à Officina da Alma
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
                <BirthDateInput
                  ref={birthDateRef}
                  value={birthDate}
                  onChange={(value) => {
                    setBirthDate(value);
                    if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: undefined }));
                  }}
                  disabled={isSubmitting}
                />
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

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Criar conta com Google
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