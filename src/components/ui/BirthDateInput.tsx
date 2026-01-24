import { forwardRef, useState, useEffect, useCallback } from "react";
import { format, parse, isValid, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface BirthDateInputProps {
  value: string; // ISO format YYYY-MM-DD or empty
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export const BirthDateInput = forwardRef<HTMLInputElement, BirthDateInputProps>(
  ({ value, onChange, disabled, error, className }, ref) => {
    const [displayValue, setDisplayValue] = useState("");
    const [internalError, setInternalError] = useState<string | null>(null);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState<Date>(subYears(new Date(), 30));

    // Sync display value when ISO value changes externally
    useEffect(() => {
      if (value) {
        const parts = value.split("-");
        if (parts.length === 3) {
          setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
          setInternalError(null);
          // Update calendar month to show the selected date's year
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          if (isValid(date)) {
            setCalendarMonth(date);
          }
        }
      }
    }, [value]);

    const validateDate = useCallback((day: string, month: string, year: string): { valid: boolean; error?: string } => {
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
        return { valid: false, error: "Ano inválido" };
      }

      if (monthNum < 1 || monthNum > 12) {
        return { valid: false, error: "Mês inválido (01-12)" };
      }

      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      if (dayNum < 1 || dayNum > daysInMonth) {
        return { valid: false, error: `Dia inválido (máx: ${daysInMonth})` };
      }

      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (date > new Date()) {
        return { valid: false, error: "Data não pode ser no futuro" };
      }

      return { valid: true };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      let digits = rawValue.replace(/\D/g, "");
      digits = digits.slice(0, 8);
      
      let formatted = "";
      if (digits.length > 0) {
        formatted = digits.slice(0, 2);
      }
      if (digits.length > 2) {
        formatted += "/" + digits.slice(2, 4);
      }
      if (digits.length > 4) {
        formatted += "/" + digits.slice(4, 8);
      }
      
      setDisplayValue(formatted);
      
      if (digits.length < 8) {
        setInternalError(null);
        onChange("");
        return;
      }
      
      const day = digits.slice(0, 2);
      const month = digits.slice(2, 4);
      const year = digits.slice(4, 8);
      
      const validation = validateDate(day, month, year);
      
      if (validation.valid) {
        const isoDate = `${year}-${month}-${day}`;
        setInternalError(null);
        onChange(isoDate);
      } else {
        setInternalError(validation.error || "Data inválida");
        onChange("");
      }
    };

    const handleBlur = () => {
      if (displayValue && displayValue.length < 10) {
        setInternalError("Complete a data (DD/MM/AAAA)");
      }
    };

    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        const isoDate = format(date, "yyyy-MM-dd");
        const displayFormatted = format(date, "dd/MM/yyyy");
        setDisplayValue(displayFormatted);
        setInternalError(null);
        onChange(isoDate);
        setIsCalendarOpen(false);
      }
    };

    const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
    const displayError = error || internalError;

    return (
      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            ref={ref}
            id="birthDate"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="DD/MM/AAAA"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!displayError}
            aria-describedby={displayError ? "birthDate-error" : undefined}
            autoComplete="bday"
            disabled={disabled}
            maxLength={10}
            className={cn(
              "flex-1",
              displayError && "border-destructive focus-visible:ring-destructive",
              className
            )}
          />
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                className="shrink-0"
                aria-label="Abrir calendário"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate && isValid(selectedDate) ? selectedDate : undefined}
                onSelect={handleCalendarSelect}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                locale={ptBR}
                captionLayout="dropdown-buttons"
                fromYear={1900}
                toYear={new Date().getFullYear()}
                className="pointer-events-auto"
                classNames={{
                  caption_dropdowns: "flex gap-2",
                  dropdown_month: "flex-1",
                  dropdown_year: "flex-1",
                  dropdown: "px-2 py-1 rounded-md bg-background border border-input text-sm",
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        {displayError && (
          <p id="birthDate-error" className="text-sm text-destructive" role="alert">
            {displayError}
          </p>
        )}
      </div>
    );
  }
);

BirthDateInput.displayName = "BirthDateInput";
