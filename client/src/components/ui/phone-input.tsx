import * as React from "react";
import { Input } from "./input";
import { formatPhoneNumber } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onChange?: (value: string) => void;
  value?: string | null;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      onChange?.(formatted);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        value={formatPhoneNumber(value)}
        onChange={handleChange}
        placeholder={props.placeholder || "123-456-7890"}
        className={className}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };

