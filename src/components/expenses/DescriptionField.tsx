import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface DescriptionFieldProps {
  value?: string | null;
  onChange: (description: string) => void;
  error?: string;
  maxLength?: number;
}

export function DescriptionField({ value, onChange, error, maxLength = 140 }: DescriptionFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      onChange(newValue);
    }
  };

  const currentLength = (value || "").length;
  const remainingChars = maxLength - currentLength;

  return (
    <div className="space-y-2" data-testid="field-description">
      <Label htmlFor="description-input">Opis (opcjonalny)</Label>
      <Textarea
        id="description-input"
        value={value || ""}
        onChange={handleChange}
        placeholder="Dodaj opcjonalny opis wydatku..."
        rows={3}
        aria-invalid={!!error}
        aria-describedby={error ? "description-error" : "description-help"}
        className={error ? "border-red-500" : ""}
        data-testid="textarea-description"
      />
      <div className="flex justify-between items-center">
        {error && (
          <p id="description-error" className="text-sm text-red-600" role="alert" data-testid="error-description">
            {error}
          </p>
        )}
        <div
          className={`text-xs ml-auto ${remainingChars < 20 ? "text-orange-600" : "text-gray-500"}`}
          data-testid="text-char-count"
        >
          {currentLength}/{maxLength} znaków
        </div>
      </div>
      <p id="description-help" className="text-xs text-gray-500" data-testid="text-helper">
        Opcjonalny opis wydatku (maksymalnie {maxLength} znaków)
      </p>
    </div>
  );
}
