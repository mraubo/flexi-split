import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CreateSettlementCommand, SettlementSummaryDTO } from "@/types";

interface NewSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (created: SettlementSummaryDTO) => void;
}

export default function NewSettlementDialog({ open, onOpenChange, onCreated }: NewSettlementDialogProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleLength = title.trim().length;
  const isValid = titleLength >= 1 && titleLength <= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError("Tytuł musi mieć od 1 do 100 znaków");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const command: CreateSettlementCommand = {
        title: title.trim(),
      };

      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && data.error?.code === "MAX_OPEN_SETTLEMENTS") {
          setError("Osiągnięto limit 3 aktywnych rozliczeń");
          return;
        }
        throw new Error(data.error?.message || "Nie udało się utworzyć rozliczenia");
      }

      onCreated(data);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-new-settlement">
        <DialogHeader>
          <DialogTitle>Nowe rozliczenie</DialogTitle>
          <DialogDescription>Utwórz nowe rozliczenie, aby śledzić wydatki z innymi osobami.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Tytuł rozliczenia</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. Wycieczka do Warszawy"
                maxLength={100}
                disabled={isSubmitting}
                data-testid="input-settlement-title"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {error && (
                    <span className="text-destructive" data-testid="error-message">
                      {error}
                    </span>
                  )}
                </span>
                <span data-testid="text-char-count">{titleLength}/100</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting} data-testid="button-create">
              {isSubmitting ? "Tworzenie..." : "Utwórz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
