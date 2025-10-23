import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseAmountToCents, formatCentsToAmount } from "@/components/hooks/useExpenseForm";
import type { AmountCents } from "@/types";

export interface AmountInputProps {
  value?: AmountCents;
  onChange: (cents: AmountCents | undefined) => void;
  error?: string;
}

export function AmountInput({ value, onChange, error }: AmountInputProps) {
  const [inputValue, setInputValue] = useState<string>(() => formatCentsToAmount(value));
  const [isEditing, setIsEditing] = useState(false);

  // Update input value when prop value changes (only when not editing)
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatCentsToAmount(value));
    }
  }, [value, isEditing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsEditing(true);

    // Update parent value immediately for validation
    const parsedCents = parseAmountToCents(newValue);
    onChange(parsedCents);
  };

  const handleBlur = () => {
    // Format the value on blur for consistent display
    const parsedCents = parseAmountToCents(inputValue);
    if (parsedCents !== undefined) {
      setInputValue(formatCentsToAmount(parsedCents));
      onChange(parsedCents); // Ensure final value is set
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="amount-input">
        Kwota <span className="text-red-500">*</span>
      </Label>
      <div className="relative">
        <Input
          id="amount-input"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          aria-invalid={!!error}
          aria-describedby={error ? "amount-error" : undefined}
          className={`pr-12 ${error ? "border-red-500" : ""}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-gray-500 text-sm">PLN</span>
        </div>
      </div>
      {error && (
        <p id="amount-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500">Wprowadź kwotę w złotych z separatorem dziesiętnym (np. 123,45)</p>
    </div>
  );
}
