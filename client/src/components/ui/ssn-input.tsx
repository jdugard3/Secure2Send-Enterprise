import { Input } from "@/components/ui/input";
import { formatSSN, unformatSSN } from "@/lib/formUtils";
import { forwardRef } from "react";

interface SSNInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (value: string) => void;
}

/**
 * SSN Input Component with auto-formatting
 * 
 * Formats SSN as XXX-XX-XXXX while typing
 * Stores value without dashes in the form
 */
export const SSNInput = forwardRef<HTMLInputElement, SSNInputProps>(
  ({ value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      
      // Remove all non-digit characters except asterisks (for masked values)
      const digitsOnly = input.replace(/[^\d*]/g, '');
      
      // Limit to 9 characters (or keep masked values as-is)
      const limited = input.includes('*') ? digitsOnly : digitsOnly.slice(0, 9);
      
      // Call onChange with unformatted value (for storage)
      if (onChange) {
        onChange(limited);
      }
    };

    // Display formatted value
    const displayValue = formatSSN(value);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        maxLength={11} // XXX-XX-XXXX = 11 characters with dashes
        placeholder={props.placeholder || "XXX-XX-XXXX"}
      />
    );
  }
);

SSNInput.displayName = "SSNInput";

