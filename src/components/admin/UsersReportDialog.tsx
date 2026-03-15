 import { useState } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Download, FileText, Search, Loader2 } from "lucide-react";
 import { useUsersList } from "@/hooks/useEnhancedAnalytics";
 import { format, parseISO } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 export function UsersReportDialog() {
   const { data: users, isLoading } = useUsersList();
   const [search, setSearch] = useState("");
   const [open, setOpen] = useState(false);
 
   const filteredUsers = users?.filter((user) =>
     user.display_name?.toLowerCase().includes(search.toLowerCase())
   );
 
  const handleExportCSV = () => {
    if (!users || users.length === 0) return;

    const headers = [
      "Nome",
      "Data de Cadastro",
      "Último Acesso",
      "Total Check-ins",
      "Total Aulas Assistidas",
      "Meditações Concluídas",
    ];

    const rows = users.map((user) => [
      user.display_name || "Sem nome",
      user.created_at
        ? format(parseISO(user.created_at), "dd/MM/yyyy", { locale: ptBR })
        : "-",
      user.last_active
        ? format(parseISO(user.last_active), "dd/MM/yyyy", { locale: ptBR })
        : "Nunca",
      user.total_checkins.toString(),
      user.total_lesson_views.toString(),
      user.total_meditations_completed.toString(),
    ]);
 
     const csvContent = [
       headers.join(";"),
       ...rows.map((row) => row.join(";")),
     ].join("\n");
 
     const blob = new Blob(["\uFEFF" + csvContent], {
       type: "text/csv;charset=utf-8;",
     });
     const url = URL.createObjectURL(blob);
     const link = document.createElement("a");
     link.href = url;
     link.download = `usuarios_${format(new Date(), "yyyy-MM-dd")}.csv`;
     link.click();
     URL.revokeObjectURL(url);
   };
 
   return (
     <Dialog open={open} onOpenChange={setOpen}>
       <DialogTrigger asChild>
         <Button variant="outline">
           <FileText className="w-4 h-4 mr-2" />
           Relatório de Usuários
         </Button>
       </DialogTrigger>
       <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle>Relatório de Usuários</DialogTitle>
         </DialogHeader>
 
         <div className="flex items-center gap-4 py-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <Input
               placeholder="Buscar por nome..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-9"
             />
           </div>
           <Button onClick={handleExportCSV} disabled={!users || users.length === 0}>
             <Download className="w-4 h-4 mr-2" />
             Exportar CSV
           </Button>
         </div>
 
         <div className="flex-1 overflow-auto">
           {isLoading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-right">Check-ins</TableHead>
                    <TableHead className="text-right">Aulas</TableHead>
                    <TableHead className="text-right">Meditações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredUsers?.map((user) => (
                   <TableRow key={user.id}>
                     <TableCell className="font-medium">
                       {user.display_name || "Sem nome"}
                     </TableCell>
                     <TableCell>
                       {user.created_at
                         ? format(parseISO(user.created_at), "dd/MM/yyyy", {
                             locale: ptBR,
                           })
                         : "-"}
                     </TableCell>
                     <TableCell>
                       {user.last_active
                         ? format(parseISO(user.last_active), "dd/MM/yyyy", {
                             locale: ptBR,
                           })
                         : "Nunca"}
                     </TableCell>
                     <TableCell className="text-right">
                       {user.total_checkins}
                     </TableCell>
                      <TableCell className="text-right">
                        {user.total_lesson_views}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.total_meditations_completed}
                      </TableCell>
                   </TableRow>
                 ))}
                 {filteredUsers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                     </TableCell>
                   </TableRow>
                 )}
               </TableBody>
             </Table>
           )}
         </div>
 
         <div className="text-sm text-muted-foreground pt-4 border-t">
           {users?.length || 0} usuários cadastrados
         </div>
       </DialogContent>
     </Dialog>
   );
 }