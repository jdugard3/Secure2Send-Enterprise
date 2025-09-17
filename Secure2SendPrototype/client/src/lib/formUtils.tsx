import React from "react";
import { ControllerRenderProps, FieldError, FieldPath, FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormFieldProps<T extends FieldValues, K extends FieldPath<T>> {
  field: ControllerRenderProps<T, K>;
  fieldState: { error?: FieldError };
  label: string;
  placeholder?: string;
  required?: boolean;
  children?: React.ReactNode;
}

export function FormInputField<T extends FieldValues, K extends FieldPath<T>>({
  field,
  fieldState,
  label,
  placeholder,
  required = false,
  ...props
}: FormFieldProps<T, K> & React.ComponentProps<typeof Input>) {
  return (
    <FormItem>
      <FormLabel className={fieldState.error ? "text-destructive" : ""}>
        {label} {required && "*"}
      </FormLabel>
      <FormControl>
        <Input
          placeholder={placeholder}
          className={cn(
            fieldState.error && "border-destructive focus-visible:ring-destructive"
          )}
          {...field}
          {...props}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export function FormSelectField<T extends FieldValues, K extends FieldPath<T>>({
  field,
  fieldState,
  label,
  placeholder,
  required = false,
  children,
  onValueChange,
}: FormFieldProps<T, K> & {
  onValueChange?: (value: string) => void;
}) {
  return (
    <FormItem>
      <FormLabel className={fieldState.error ? "text-destructive" : ""}>
        {label} {required && "*"}
      </FormLabel>
      <Select onValueChange={onValueChange || field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger 
            className={cn(
              fieldState.error && "border-destructive focus:ring-destructive"
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  );
}

// Utility to get error styling classes
export const getErrorClasses = (hasError: boolean) => ({
  label: hasError ? "text-destructive" : "",
  input: hasError ? "border-destructive focus-visible:ring-destructive" : "",
  select: hasError ? "border-destructive focus:ring-destructive" : "",
});
