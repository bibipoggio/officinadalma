import { forwardRef, useState, useEffect } from "react";
import { format, parse, isValid, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BirthDateInputProps {
  value: string; // ISO format YYYY-MM-DD or empty
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

export const BirthDateInput = forwardRef<HTMLButtonElement, BirthDateInputProps>(
  ({ value, onChange, disabled, error, className }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
      if (value) {
        const date = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(date)) return date;
      }
      return subYears(new Date(), 30);
    });

    // Sync calendar month when value changes externally
    useEffect(() => {
      if (value) {
        const date = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(date)) {
          setCalendarMonth(date);
        }
      }
    }, [value]);

    const handleSelect = (date: Date | undefined) => {
      if (date) {
        const isoDate = format(date, "yyyy-MM-dd");
        onChange(isoDate);
        setIsOpen(false);
      }
    };

    const handleMonthChange = (monthIndex: string) => {
      const newDate = new Date(calendarMonth);
      newDate.setMonth(parseInt(monthIndex));
      setCalendarMonth(newDate);
    };

    const handleYearChange = (year: string) => {
      const newDate = new Date(calendarMonth);
      newDate.setFullYear(parseInt(year));
      setCalendarMonth(newDate);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(calendarMonth);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      if (newDate <= new Date() && newDate >= new Date(1900, 0, 1)) {
        setCalendarMonth(newDate);
      }
    };

    const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
    const displayValue = selectedDate && isValid(selectedDate) 
      ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : null;

    return (
      <div className="space-y-1">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !displayValue && "text-muted-foreground",
                error && "border-destructive focus-visible:ring-destructive",
                className
              )}
              aria-invalid={!!error}
              aria-describedby={error ? "birthDate-error" : undefined}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              {displayValue || "Selecione sua data de nascimento"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
            <div className="p-3 space-y-3">
              {/* Month/Year Navigation Header */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateMonth('prev')}
                  disabled={calendarMonth <= new Date(1900, 0, 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex gap-2 flex-1">
                  <Select
                    value={calendarMonth.getMonth().toString()}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={calendarMonth.getFullYear().toString()}
                    onValueChange={handleYearChange}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigateMonth('next')}
                  disabled={calendarMonth >= new Date()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Calendar Grid */}
              <Calendar
                mode="single"
                selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
                onSelect={handleSelect}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                locale={ptBR}
                className="pointer-events-auto p-0"
                classNames={{
                  caption: "hidden",
                  nav: "hidden",
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
        {error && (
          <p id="birthDate-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

BirthDateInput.displayName = "BirthDateInput";
