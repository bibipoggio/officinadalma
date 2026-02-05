 import { Card, CardContent } from "@/components/ui/card";
 import { TrendingUp } from "lucide-react";
 
 interface AnalyticsMetricCardProps {
   title: string;
   value: number;
   subtitle?: string;
   icon: React.ReactNode;
   trend?: string;
   format?: "number" | "percent";
 }
 
 export function AnalyticsMetricCard({
   title,
   value,
   subtitle,
   icon,
   trend,
   format = "number",
 }: AnalyticsMetricCardProps) {
   const formattedValue =
     format === "percent"
       ? `${value.toLocaleString("pt-BR")}%`
       : value.toLocaleString("pt-BR");
 
   return (
     <Card>
       <CardContent className="pt-6">
         <div className="flex items-start justify-between">
           <div className="space-y-1">
             <p className="text-sm font-medium text-muted-foreground">{title}</p>
             <p className="text-3xl font-bold">{formattedValue}</p>
             {subtitle && (
               <p className="text-xs text-muted-foreground">{subtitle}</p>
             )}
             {trend && (
               <p className="text-xs text-primary flex items-center gap-1">
                 <TrendingUp className="w-3 h-3" />
                 {trend}
               </p>
             )}
           </div>
           <div className="p-3 bg-primary/10 rounded-full text-primary">
             {icon}
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }