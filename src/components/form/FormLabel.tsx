/**
 * FormLabel Component
 * Wrapper around shadcn/ui Label with consistent styling
 */

import { Label } from "@/components/ui/label";

interface FormLabelProps {
  id?: string;
  label: string;
  required?: boolean;
  helpText?: string;
}

export function FormLabel({ id, label, required = false, helpText }: FormLabelProps) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </Label>
      {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}
