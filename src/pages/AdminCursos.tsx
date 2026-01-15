import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingState, EmptyState, ErrorState } from "@/components/layout/PageState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { useState } from "react";
import { Plus, GraduationCap, Edit, Eye, MoreVertical } from "lucide-react";

type PageState = "loading" | "empty" | "error" | "success";

const mockCourses = [
  {
    id: "1",
    title: "Despertar Interior",
    type: "regular",
    lessonsCount: 12,
    status: "published",
  },
  {
    id: "2",
    title: "Meditação Avançada",
    type: "aparte",
    lessonsCount: 8,
    status: "draft",
  },
];

const AdminCursos = () => {
  const [state] = useState<PageState>("success");

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Cursos
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie cursos e aulas
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Novo Curso
          </Button>
        </header>

        {state === "loading" && <LoadingState message="Carregando cursos..." />}
        
        {state === "error" && (
          <ErrorState 
            title="Erro ao carregar"
            message="Não foi possível carregar os cursos."
            onRetry={() => {}}
          />
        )}

        {state === "empty" && (
          <EmptyState
            icon={<GraduationCap className="w-8 h-8 text-muted-foreground" />}
            title="Nenhum curso criado"
            description="Crie o primeiro curso para sua plataforma."
            action={{
              label: "Criar Curso",
              onClick: () => {},
            }}
          />
        )}

        {state === "success" && (
          <div className="space-y-3">
            {mockCourses.map((course) => (
              <Card key={course.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amethyst-light flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{course.title}</h3>
                        <Chip size="sm" variant={course.type === "aparte" ? "primary" : "muted"}>
                          {course.type === "regular" ? "Básico" : "Premium"}
                        </Chip>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {course.lessonsCount} aulas • {course.status === "published" ? "Publicado" : "Rascunho"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminCursos;
