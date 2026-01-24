import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateTopic } from "@/hooks/useForum";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

const ForumNewTopic = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTopic, isSubmitting } = useCreateTopic();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o conteúdo do tópico.",
        variant: "destructive",
      });
      return;
    }

    const result = await createTopic(title.trim(), content.trim());
    
    if (result.success && result.topicId) {
      toast({
        title: "Tópico criado",
        description: "Seu tópico foi publicado com sucesso.",
      });
      navigate(`/comunidade/forum/${result.topicId}`);
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível criar o tópico. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/comunidade/forum")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Novo Tópico
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie uma nova discussão no fórum
            </p>
          </div>
        </header>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  placeholder="Qual é a sua dúvida ou assunto?"
                  disabled={isSubmitting}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Conteúdo</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 5000))}
                  placeholder="Descreva sua dúvida ou inicie a discussão com mais detalhes..."
                  className="min-h-[200px] resize-none"
                  disabled={isSubmitting}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {content.length}/5000
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/comunidade/forum")}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Publicando..." : "Publicar Tópico"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ForumNewTopic;
