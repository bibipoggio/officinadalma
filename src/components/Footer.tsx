import { Sparkles, Heart } from "lucide-react";

const footerLinks = {
  platform: [
    { label: "Cursos", href: "#cursos" },
    { label: "Comunidade", href: "#comunidade" },
    { label: "Planos", href: "#planos" },
    { label: "Blog", href: "#blog" },
  ],
  support: [
    { label: "Central de Ajuda", href: "#ajuda" },
    { label: "Contato", href: "#contato" },
    { label: "FAQ", href: "#faq" },
  ],
  legal: [
    { label: "Termos de Uso", href: "#termos" },
    { label: "Privacidade", href: "#privacidade" },
    { label: "Cookies", href: "#cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-cream-warm border-t border-border">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-sage flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">
                Officina da Alma
              </span>
            </a>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Transformando vidas através do autoconhecimento desde 2024.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              Plataforma
            </h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              Suporte
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Officina da Alma. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Feito com <Heart className="w-4 h-4 text-destructive inline" /> no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
