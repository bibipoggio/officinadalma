 import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import type { AnalyticsPeriod } from "@/hooks/useEnhancedAnalytics";
 
 interface PeriodFilterProps {
   value: AnalyticsPeriod;
   onChange: (period: AnalyticsPeriod) => void;
 }
 
 export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
   return (
     <Tabs value={value} onValueChange={(v) => onChange(v as AnalyticsPeriod)}>
       <TabsList>
         <TabsTrigger value="today">Hoje</TabsTrigger>
         <TabsTrigger value="week">7 dias</TabsTrigger>
         <TabsTrigger value="month">Mês</TabsTrigger>
         <TabsTrigger value="all">Total</TabsTrigger>
       </TabsList>
     </Tabs>
   );
 }