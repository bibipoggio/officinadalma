import { forwardRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
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
    // Internal state to track the display value (DD/MM/AAAA format)
    const [displayValue, setDisplayValue] = useState("");
    const [internalError, setInternalError] = useState<string | null>(null);

    // Sync display value when ISO value changes externally
    useEffect(() => {
      if (value) {
        // Convert ISO (YYYY-MM-DD) to display (DD/MM/AAAA)
        const parts = value.split("-");
        if (parts.length === 3) {
          setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
          setInternalError(null);
        }
      }
    }, [value]);

    const validateDate = useCallback((day: string, month: string, year: string): { valid: boolean; error?: string } => {
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Check year range
      if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
        return { valid: false, error: "Ano inválido" };
      }

      // Check month range
      if (monthNum < 1 || monthNum > 12) {
        return { valid: false, error: "Mês inválido (01-12)" };
      }

      // Check day range based on month
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      if (dayNum < 1 || dayNum > daysInMonth) {
        return { valid: false, error: `Dia inválido para este mês (máx: ${daysInMonth})` };
      }

      // Create date and verify it's not in the future
      const date = new Date(yearNum, monthNum - 1, dayNum);
      if (date > new Date()) {
        return { valid: false, error: "Data não pode ser no futuro" };
      }

      return { valid: true };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      // Only allow digits and forward slashes
      let digits = rawValue.replace(/\D/g, "");
      
      // Limit to 8 digits
      digits = digits.slice(0, 8);
      
      // Format as DD/MM/AAAA
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
      
      // Clear internal error while typing
      if (digits.length < 8) {
        setInternalError(null);
        onChange("");
        return;
      }
      
      // When complete (8 digits), validate and convert to ISO
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
      // Show error if field is incomplete on blur
      if (displayValue && displayValue.length < 10) {
        setInternalError("Complete a data (DD/MM/AAAA)");
      }
    };

    const displayError = error || internalError;

    return (
      <div className="space-y-1">
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
            displayError && "border-destructive focus-visible:ring-destructive",
            className
          )}
        />
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
