import { Button } from "@/components/ui/button";
import { FileText, Archive } from "lucide-react";

interface EmptyStateProps {
  variant: "active" | "archive";
  canCreate: boolean;
  onCreateClick: () => void;
}

export default function EmptyState({ variant, canCreate, onCreateClick }: EmptyStateProps) {
  const isActive = variant === "active";

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state-container">
      {isActive ? (
        <FileText className="h-12 w-12 text-muted-foreground mb-4" data-testid="icon-empty-active" />
      ) : (
        <Archive className="h-12 w-12 text-muted-foreground mb-4" data-testid="icon-empty-archive" />
      )}
      <h3 className="text-lg font-semibold mb-2" data-testid="heading-empty-state">
        {isActive ? "Brak aktywnych rozliczeń" : "Brak archiwalnych rozliczeń"}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md" data-testid="text-empty-description">
        {isActive
          ? "Rozpocznij nowe rozliczenie, aby śledzić wydatki i rozliczenia z innymi osobami."
          : "Zamknięte rozliczenia pojawią się tutaj. Możesz je przeglądać lub usunąć."}
      </p>
      {isActive && canCreate && (
        <Button onClick={onCreateClick} className="gap-2" data-testid="button-create-first-settlement">
          <FileText className="h-4 w-4" />
          Utwórz pierwsze rozliczenie
        </Button>
      )}
    </div>
  );
}
