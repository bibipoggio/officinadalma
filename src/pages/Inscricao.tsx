import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Sparkles, Loader2, CreditCard, ArrowLeft, ArrowRight, ClipboardCheck, Clock } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useInscricao } from "@/hooks/useInscricao";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const premiumFeatures = [
  "Acesso a todos os cursos premium",
  "Meditações guiadas diárias",
  "Tônica do dia personalizada",
  "Comunidade exclusiva",
  "Suporte prioritário",
];

const desafiosOptions = [
  "Estagnação Profissional ou Pessoal",
  "Falta de Clareza e Análise Paralisante",
  "Fadiga Mental e Emocional",
  "Vazio Disfarçado",
  "Auto Sabotagem Inconsciente / Procrastinação",
  "Desalinhamento Crônico com sua Essência",
  "Bloqueios Energéticos e Emocionais",
  "Desconexão de sua Essência Divina",
  "Vazio Existencial Profundo",
  "Medo e Dúvida Profundos",
  "Perda da Liberdade Intrínseca",
];

const Inscricao = () => {
  const { user } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const { inscricao, isLoading: inscLoading, hasCompleted, saveInscricao } = useInscricao();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"mensal" | "semestral">("mensal");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [form, setForm] = useState({
    nome_completo: "",
    idade: "",
    estado_civil: "",
    estado_civil_outro: "",
    tem_filhos: "",
    filhos_quantos: "",
    filhos_idades: "",
    cidade_estado: "",
    escolaridade: "",
    trabalhando: "",
    ocupacao: "",
    satisfacao_profissional: "",
    como_conheceu: "",
    como_conheceu_detalhe: "",
    experiencia_previa: "",
    cursos_previos: "",
    nivel_autoconhecimento: "",
    nivel_justificativa: "",
    vazio_persistente: "",
    desafios: [] as string[],
    desafio_principal: "",
    energia_fisica: "",
    saude_mental: "",
    acompanhamento_profissional: "",
    saude_emocional: "",
    emocao_recorrente: "",
    motivacao_principal: "",
    valores_ressoam: "",
    projeto_alma: "",
    cursos_interesse_futuro: "",
    temas_adicionais: "",
    expectativa_diferencial: "",
    conexao_mentores: "",
  });

  const updateField = (field: string, value: string | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleDesafio = (d: string) => {
    setForm(prev => ({
      ...prev,
      desafios: prev.desafios.includes(d)
        ? prev.desafios.filter(x => x !== d)
        : [...prev.desafios, d],
    }));
  };

  const handleSaveForm = async () => {
    if (!form.nome_completo.trim() || !form.cidade_estado.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha pelo menos nome completo e cidade/estado.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await saveInscricao(form as unknown as Record<string, unknown>);
      toast({ title: "Questionário enviado!", description: "Suas respostas foram salvas com sucesso." });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubscribe = () => {
    if (!user) return;
    const PLAN_ID_PROMO = "74b17db669014a39a31dac10bb79a7ca";
    const PLAN_ID_PADRAO = "b1f6ffd2f3ab42fbada29ac49bf3353a";
    const PLAN_ID_SEMESTRAL = "600173620c9045cc8e454f9b797b3c41";

    let planId: string;
    if (selectedPlan === "semestral") {
      planId = PLAN_ID_SEMESTRAL;
    } else {
      const now = new Date();
      const isPromo = now < new Date("2026-05-01T00:00:00-03:00");
      planId = isPromo ? PLAN_ID_PROMO : PLAN_ID_PADRAO;
    }

    const planUrl = `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=${planId}&external_reference=${user.id}`;
    window.open(planUrl, "_blank");
  };

  if (subLoading || inscLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isPremium) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-display font-semibold text-foreground">Assinatura Ativa</h1>
              <p className="text-muted-foreground">Você já tem acesso a todo o conteúdo premium. Aproveite!</p>
              <Button variant="outline" onClick={() => navigate("/aulas")}>Ver Cursos</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Already submitted & pending approval
  if (hasCompleted && inscricao?.status === "pendente") {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-accent flex items-center justify-center">
                <Clock className="w-8 h-8 text-accent-foreground" />
              </div>
              <h1 className="text-2xl font-display font-semibold text-foreground">Inscrição Enviada</h1>
              <p className="text-muted-foreground">
                Seu questionário foi recebido e está em análise. Você receberá a confirmação em breve para prosseguir com o pagamento.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Calculate current mensal price
  const now = new Date();
  const isPromo = now < new Date("2026-05-01T00:00:00-03:00");
  const mensalPrice = isPromo ? "79" : "97";
  const mensalLabel = isPromo ? "Promoção 1ª Turma" : "";

  if (hasCompleted && inscricao?.status === "aprovado") {
    return (
      <AppLayout>
        <div className="space-y-8 max-w-lg mx-auto py-4">
          <header className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ClipboardCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold text-foreground">Inscrição Aprovada!</h1>
            <p className="text-muted-foreground mt-2">Escolha seu plano e prossiga com o pagamento</p>
          </header>

          {/* Plan Selector */}
          <div className="grid gap-3">
            <button
              onClick={() => setSelectedPlan("mensal")}
              className={cn(
                "relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                selectedPlan === "mensal"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  selectedPlan === "mensal" ? "border-primary-foreground" : "border-muted-foreground/40"
                )}>
                  {selectedPlan === "mensal" && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
                </div>
                <div>
                  <p className={cn("font-semibold", selectedPlan === "mensal" ? "text-primary-foreground" : "text-foreground")}>Mensal</p>
                  <p className={cn("text-xs", selectedPlan === "mensal" ? "text-primary-foreground/80" : "text-muted-foreground")}>Pagamento mensal recorrente (12x)</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn("text-xl font-bold", selectedPlan === "mensal" ? "text-primary-foreground" : "text-foreground")}>R$ {mensalPrice}</span>
                <span className={cn("text-sm", selectedPlan === "mensal" ? "text-primary-foreground/80" : "text-muted-foreground")}>/mês</span>
                {isPromo && (
                  <p className={cn("text-xs font-medium", selectedPlan === "mensal" ? "text-primary-foreground/90" : "text-primary")}>{mensalLabel}</p>
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedPlan("semestral")}
              className={cn(
                "relative flex items-center justify-between rounded-xl border-2 p-4 text-left transition-all",
                selectedPlan === "semestral"
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                  selectedPlan === "semestral" ? "border-primary-foreground" : "border-muted-foreground/40"
                )}>
                  {selectedPlan === "semestral" && <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />}
                </div>
                <div>
                  <p className={cn("font-semibold", selectedPlan === "semestral" ? "text-primary-foreground" : "text-foreground")}>Semestral</p>
                  <p className={cn("text-xs", selectedPlan === "semestral" ? "text-primary-foreground/80" : "text-muted-foreground")}>Pagamento único por 6 meses</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn("text-xl font-bold", selectedPlan === "semestral" ? "text-primary-foreground" : "text-foreground")}>R$ 485,39</span>
                <p className={cn("text-xs", selectedPlan === "semestral" ? "text-primary-foreground/80" : "text-muted-foreground")}>≈ R$ 80,90/mês</p>
              </div>
            </button>
          </div>

          <Card className="border-2 border-primary">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <CreditCard className="w-4 h-4" />
                <span>Pague com PIX ou Cartão de Crédito</span>
              </div>
              <ul className="space-y-3 mb-6">
                {premiumFeatures.map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                    <span className="text-sm text-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button size="xl" className="w-full" onClick={handleSubscribe} disabled={isProcessing}>
                {isProcessing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</>) : "Assinar Agora"}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Pagamento seguro via Mercado Pago. Cancele quando quiser.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Rejected
  if (hasCompleted && inscricao?.status === "rejeitado") {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-12">
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <h1 className="text-2xl font-display font-semibold text-foreground">Inscrição não aprovada</h1>
              <p className="text-muted-foreground">
                Infelizmente sua inscrição não foi aprovada neste momento. Entre em contato conosco para mais informações.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // QUESTIONNAIRE FORM (multi-step)
  const totalSteps = 5;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl mx-auto py-4 px-2">
        <header className="text-center">
          <div className="w-14 h-14 rounded-full bg-amethyst-light flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Questionário de Inscrição
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Academia de Expansão da Consciência e Alquimia Interior
          </p>
        </header>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i + 1 <= step ? "bg-primary w-8" : "bg-muted w-6"
              }`}
            />
          ))}
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* STEP 1: Dados Cadastrais */}
            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold text-foreground">Parte 1: Dados Cadastrais</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Nome Completo *</Label>
                    <Input value={form.nome_completo} onChange={e => updateField("nome_completo", e.target.value)} placeholder="Seu nome completo" />
                  </div>
                  <div>
                    <Label>Idade</Label>
                    <Input value={form.idade} onChange={e => updateField("idade", e.target.value)} placeholder="Ex: 35" type="number" />
                  </div>
                  <div>
                    <Label>Estado Civil</Label>
                    <RadioGroup value={form.estado_civil} onValueChange={v => updateField("estado_civil", v)}>
                      {["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)", "Outro"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`ec-${o}`} />
                          <Label htmlFor={`ec-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {form.estado_civil === "Outro" && (
                      <Input className="mt-2" value={form.estado_civil_outro} onChange={e => updateField("estado_civil_outro", e.target.value)} placeholder="Especifique" />
                    )}
                  </div>
                  <div>
                    <Label>Você tem filhos?</Label>
                    <RadioGroup value={form.tem_filhos} onValueChange={v => updateField("tem_filhos", v)}>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Sim" id="f-s" /><Label htmlFor="f-s" className="font-normal">Sim</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Não" id="f-n" /><Label htmlFor="f-n" className="font-normal">Não</Label></div>
                    </RadioGroup>
                    {form.tem_filhos === "Sim" && (
                      <div className="mt-2 space-y-2">
                        <Input value={form.filhos_quantos} onChange={e => updateField("filhos_quantos", e.target.value)} placeholder="Quantos filhos?" />
                        <Input value={form.filhos_idades} onChange={e => updateField("filhos_idades", e.target.value)} placeholder="Idades (ex: 5, 12, 18)" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Cidade e Estado *</Label>
                    <Input value={form.cidade_estado} onChange={e => updateField("cidade_estado", e.target.value)} placeholder="Ex: São Paulo, SP" />
                  </div>
                  <div>
                    <Label>Escolaridade / Formação</Label>
                    <Input value={form.escolaridade} onChange={e => updateField("escolaridade", e.target.value)} placeholder="Último nível concluído e área" />
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Perfil Profissional */}
            {step === 2 && (
              <>
                <h2 className="text-lg font-semibold text-foreground">Parte 1.2: Perfil Profissional</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Está trabalhando atualmente?</Label>
                    <RadioGroup value={form.trabalhando} onValueChange={v => updateField("trabalhando", v)}>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Sim" id="t-s" /><Label htmlFor="t-s" className="font-normal">Sim</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="Não" id="t-n" /><Label htmlFor="t-n" className="font-normal">Não</Label></div>
                    </RadioGroup>
                  </div>
                  {form.trabalhando === "Sim" && (
                    <>
                      <div>
                        <Label>Ocupação atual</Label>
                        <Input value={form.ocupacao} onChange={e => updateField("ocupacao", e.target.value)} placeholder="Sua ocupação" />
                      </div>
                      <div>
                        <Label>Nível de satisfação profissional</Label>
                        <RadioGroup value={form.satisfacao_profissional} onValueChange={v => updateField("satisfacao_profissional", v)}>
                          {["Muito Insatisfeito(a)", "Insatisfeito(a)", "Neutro(a)", "Satisfeito(a)", "Muito Satisfeito(a)"].map(o => (
                            <div key={o} className="flex items-center space-x-2">
                              <RadioGroupItem value={o} id={`sp-${o}`} />
                              <Label htmlFor={`sp-${o}`} className="font-normal">{o}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    </>
                  )}
                  <div>
                    <Label>Como conheceu a Officina da Alma?</Label>
                    <RadioGroup value={form.como_conheceu} onValueChange={v => updateField("como_conheceu", v)}>
                      {["Indicação de amigo(a)", "Redes Sociais", "Evento/Workshop", "Busca online", "Outro"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`ck-${o}`} />
                          <Label htmlFor={`ck-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {["Redes Sociais", "Evento/Workshop", "Outro"].includes(form.como_conheceu) && (
                      <Input className="mt-2" value={form.como_conheceu_detalhe} onChange={e => updateField("como_conheceu_detalhe", e.target.value)} placeholder="Qual?" />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* STEP 3: Experiência espiritual */}
            {step === 3 && (
              <>
                <h2 className="text-lg font-semibold text-foreground">Parte 2: Jornada de Autodescoberta</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Quais práticas de desenvolvimento pessoal/espiritual você já praticou?</Label>
                    <Textarea value={form.experiencia_previa} onChange={e => updateField("experiencia_previa", e.target.value)} placeholder="Livros, podcasts, meditação, yoga, etc." rows={3} />
                  </div>
                  <div>
                    <Label>Cursos/workshops/formações na área espiritual ou holística</Label>
                    <Textarea value={form.cursos_previos} onChange={e => updateField("cursos_previos", e.target.value)} placeholder="Reiki, Astrologia, ThetaHealing, etc." rows={3} />
                  </div>
                  <div>
                    <Label>Nível de autoconhecimento</Label>
                    <RadioGroup value={form.nivel_autoconhecimento} onValueChange={v => updateField("nivel_autoconhecimento", v)}>
                      {["Iniciante", "Intermediário(a)", "Experiente"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`na-${o}`} />
                          <Label htmlFor={`na-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Textarea className="mt-2" value={form.nivel_justificativa} onChange={e => updateField("nivel_justificativa", e.target.value)} placeholder="Justifique brevemente" rows={2} />
                  </div>
                  <div>
                    <Label>Existe algum "vazio persistente" ou inquietude que o(a) impulsiona?</Label>
                    <Textarea value={form.vazio_persistente} onChange={e => updateField("vazio_persistente", e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Desafios que você se identifica (marque todos que se aplicam)</Label>
                    <div className="space-y-2 mt-2">
                      {desafiosOptions.map(d => (
                        <div key={d} className="flex items-start space-x-2">
                          <Checkbox
                            checked={form.desafios.includes(d)}
                            onCheckedChange={() => toggleDesafio(d)}
                            id={`des-${d}`}
                          />
                          <Label htmlFor={`des-${d}`} className="font-normal text-sm leading-snug">{d}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Principal dor/desafio que motivou buscar a Officina da Alma</Label>
                    <Textarea value={form.desafio_principal} onChange={e => updateField("desafio_principal", e.target.value)} rows={3} />
                  </div>
                </div>
              </>
            )}

            {/* STEP 4: Saúde Integral */}
            {step === 4 && (
              <>
                <h2 className="text-lg font-semibold text-foreground">Parte 2.3: Saúde Integral</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Nível de energia física e vitalidade</Label>
                    <RadioGroup value={form.energia_fisica} onValueChange={v => updateField("energia_fisica", v)}>
                      {["Muito baixo", "Baixo", "Médio", "Bom", "Muito bom"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`ef-${o}`} />
                          <Label htmlFor={`ef-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Saúde mental — clareza, foco, manejo de estresse</Label>
                    <RadioGroup value={form.saude_mental} onValueChange={v => updateField("saude_mental", v)}>
                      {["Grande dificuldade", "Desafios frequentes", "Oscilações", "Boa clareza", "Excelente equilíbrio"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`sm-${o}`} />
                          <Label htmlFor={`sm-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Acompanhamento profissional de saúde mental</Label>
                    <RadioGroup value={form.acompanhamento_profissional} onValueChange={v => updateField("acompanhamento_profissional", v)}>
                      {["Sim, atualmente", "Sim, no passado", "Não"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`ap-${o}`} />
                          <Label htmlFor={`ap-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Saúde emocional — capacidade de sentir e transmutar emoções</Label>
                    <RadioGroup value={form.saude_emocional} onValueChange={v => updateField("saude_emocional", v)}>
                      {["Grande dificuldade", "Desafios para expressar", "Lido na maioria das vezes", "Geralmente equilibrado(a)", "Processo de forma consciente"].map(o => (
                        <div key={o} className="flex items-center space-x-2">
                          <RadioGroupItem value={o} id={`se-${o}`} />
                          <Label htmlFor={`se-${o}`} className="font-normal">{o}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Emoção ou padrão recorrente que gostaria de transformar (opcional)</Label>
                    <Textarea value={form.emocao_recorrente} onChange={e => updateField("emocao_recorrente", e.target.value)} rows={2} />
                  </div>
                </div>
              </>
            )}

            {/* STEP 5: Aspirações */}
            {step === 5 && (
              <>
                <h2 className="text-lg font-semibold text-foreground">Parte 2.4: Aspirações e Metas</h2>
                <div className="space-y-4">
                  <div>
                    <Label>Principal motivação para se juntar à Officina da Alma</Label>
                    <Textarea value={form.motivacao_principal} onChange={e => updateField("motivacao_principal", e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Quais valores da Officina da Alma mais ressoam com você?</Label>
                    <Textarea value={form.valores_ressoam} onChange={e => updateField("valores_ressoam", e.target.value)} placeholder="Expansão da Consciência, Alquimia Interior, Autenticidade..." rows={3} />
                  </div>
                  <div>
                    <Label>Como redesenharia o "projeto arquitetônico da sua alma"?</Label>
                    <Textarea value={form.projeto_alma} onChange={e => updateField("projeto_alma", e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Temas ou cursos de interesse futuro</Label>
                    <Textarea value={form.cursos_interesse_futuro} onChange={e => updateField("cursos_interesse_futuro", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label>Temas adicionais que gostaria que a Officina trouxesse</Label>
                    <Textarea value={form.temas_adicionais} onChange={e => updateField("temas_adicionais", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label>O que faz acreditar que aqui encontrará a jornada transformadora?</Label>
                    <Textarea value={form.expectativa_diferencial} onChange={e => updateField("expectativa_diferencial", e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Conexão com os Mentores Espirituais (Jesus Sananda e Mãe Maria)</Label>
                    <Textarea value={form.conexao_mentores} onChange={e => updateField("conexao_mentores", e.target.value)} rows={3} />
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
              ) : <div />}

              {step < totalSteps ? (
                <Button onClick={() => setStep(s => s + 1)}>
                  Próximo <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSaveForm} disabled={isSaving}>
                  {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>) : "Enviar Questionário"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Inscricao;
