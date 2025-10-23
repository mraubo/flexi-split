import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DateString } from "@/types";

export interface DateInputProps {
  value?: DateString;
  onChange: (date: DateString) => void;
  error?: string;
}

export function DateInput({ value, onChange, error }: DateInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value as DateString);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="date-input">
        Data wydatku <span className="text-red-500">*</span>
      </Label>
      <Input
        id="date-input"
        type="date"
        value={value || ""}
        onChange={handleChange}
        aria-invalid={!!error}
        aria-describedby={error ? "date-error" : undefined}
        className={error ? "border-red-500" : ""}
      />
      {error && (
        <p id="date-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500">Wybierz datę, kiedy został poniesiony wydatek</p>
    </div>
  );
}
