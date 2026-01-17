import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Share, Plus, MoreVertical, Download, Smartphone, Apple } from "lucide-react";

export default function Instalar() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <img 
              src="/icon-192.png" 
              alt="Officina d'Alma" 
              className="w-24 h-24 rounded-2xl shadow-elegant"
            />
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground">
            Instale o App
          </h1>
          <p className="text-muted-foreground">
            Adicione à sua tela inicial para acesso rápido e uma experiência otimizada.
          </p>
        </div>

        {/* iOS Instructions */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                <Apple className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                iPhone / iPad
              </h2>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  1
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Abra o app no <strong>Safari</strong> (navegador padrão)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Outros navegadores como Chrome não suportam instalação no iOS
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  2
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Toque no ícone de <strong>Compartilhar</strong>
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                    <Share className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Na barra inferior do Safari</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  3
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Selecione <strong>"Adicionar à Tela de Início"</strong>
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">Role para baixo se necessário</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  4
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Toque em <strong>"Adicionar"</strong> no canto superior direito
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Android Instructions */}
        <Card className="bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-green-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Android
              </h2>
            </div>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  1
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Abra o app no <strong>Chrome</strong>
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  2
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Toque no menu <strong>⋮</strong> (três pontos)
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">No canto superior direito</span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  3
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Selecione <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
                    <Download className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">No menu que aparecer</span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
                  4
                </div>
                <div className="space-y-2 pt-1">
                  <p className="text-foreground">
                    Confirme tocando em <strong>"Instalar"</strong>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <div className="text-center space-y-4 pb-8">
          <h3 className="text-lg font-display font-medium text-foreground">
            Vantagens do App
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">
              ✨ Acesso rápido
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">
              📱 Tela cheia
            </span>
            <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm">
              🚀 Carregamento veloz
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
