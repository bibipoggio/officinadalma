import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroBg} 
          alt="" 
          className="w-full h-full object-cover opacity-40"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32 text-center max-w-4xl">
        <div className="animate-float inline-block mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-light/80 text-sage-dark text-sm font-medium backdrop-blur-sm border border-sage/20">
            ✨ Experimente 7 dias grátis
          </span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight text-balance">
          Desperte o Melhor
          <br />
          <span className="text-sage">de Si Mesmo</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body leading-relaxed">
          Uma plataforma de autoconhecimento com cursos transformadores, 
          práticas diárias e uma comunidade acolhedora para sua jornada interior.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="xl">
            Começar Minha Jornada
          </Button>
          <Button variant="ethereal" size="xl">
            Conhecer os Cursos
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Mais de 5.000 almas já transformadas • Cancele quando quiser
        </p>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
