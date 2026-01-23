import { forwardRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface BirthDateInputProps {
  value: string; // ISO format YYYY-MM-DD or empty
  onChange: (isoDate: string) => void;
  disabled?: boolean;
  error?: string;
}

export const BirthDateInput = forwardRef<HTMLInputElement, BirthDateInputProps>(
  ({ value, onChange, disabled, error }, ref) => {
    // Internal state to track the display value (DD/MM/AAAA format)
    const [displayValue, setDisplayValue] = useState("");

    // Sync display value when ISO value changes externally
    useEffect(() => {
      if (value) {
        // Convert ISO (YYYY-MM-DD) to display (DD/MM/AAAA)
        const parts = value.split("-");
        if (parts.length === 3) {
          setDisplayValue(`${parts[2]}/${parts[1]}/${parts[0]}`);
        }
      } else {
        setDisplayValue("");
      }
    }, [value]);

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
      
      // When complete (8 digits), convert to ISO and call onChange
      if (digits.length === 8) {
        const day = digits.slice(0, 2);
        const month = digits.slice(2, 4);
        const year = digits.slice(4, 8);
        const isoDate = `${year}-${month}-${day}`;
        
        // Validate the date
        const date = new Date(isoDate);
        const isValidDate = 
          !isNaN(date.getTime()) && 
          date.getFullYear() === parseInt(year) &&
          date.getMonth() + 1 === parseInt(month) &&
          date.getDate() === parseInt(day) &&
          parseInt(year) >= 1900;
        
        if (isValidDate) {
          onChange(isoDate);
        } else {
          // Invalid date - clear the ISO value
          onChange("");
        }
      } else {
        // Incomplete - clear the ISO value
        onChange("");
      }
    };

    return (
      <>
        <Input
          ref={ref}
          id="birthDate"
          type="text"
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          value={displayValue}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? "birthDate-error" : undefined}
          autoComplete="bday"
          disabled={disabled}
          maxLength={10}
        />
        {error && (
          <p id="birthDate-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </>
    );
  }
);

BirthDateInput.displayName = "BirthDateInput";
