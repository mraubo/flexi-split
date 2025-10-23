import { Button } from "@/components/ui/button";
import { FileText, Users, Filter } from "lucide-react";

interface ExpensesEmptyStateProps {
  type: "no-participants" | "no-expenses" | "no-filtered-expenses";
  isOwner?: boolean;
  isReadOnly: boolean;
  onClearFilter?: () => void;
}

export default function ExpensesEmptyState({
  type,
  isOwner = false,
  isReadOnly,
  onClearFilter,
}: ExpensesEmptyStateProps) {
  const handleAddParticipant = () => {
    // TODO: Navigate to participants step
    // For now, this will be implemented when we add step navigation
  };

  const handleAddExpense = () => {
    // TODO: Open add expense dialog
    // For now, this will be implemented when we add expense creation
  };

  const handleClearFilter = () => {
    if (onClearFilter) {
      onClearFilter();
    }
  };

  if (type === "no-participants") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 text-muted-foreground mb-4">
          <Users className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Brak uczestników</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Aby dodać koszty, najpierw musisz dodać przynajmniej jednego uczestnika do rozliczenia.
        </p>
        {isOwner && !isReadOnly && <Button onClick={handleAddParticipant}>Dodaj pierwszego uczestnika</Button>}
      </div>
    );
  }

  if (type === "no-expenses") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 text-muted-foreground mb-4">
          <FileText className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Brak kosztów</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Nie masz jeszcze żadnych kosztów w tym rozliczeniu. Dodaj pierwszy wydatek, aby rozpocząć.
        </p>
        {isOwner && !isReadOnly && <Button onClick={handleAddExpense}>Dodaj pierwszy koszt</Button>}
      </div>
    );
  }

  if (type === "no-filtered-expenses") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-12 w-12 text-muted-foreground mb-4">
          <Filter className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Brak wyników</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Nie znaleziono kosztów spełniających kryteria filtra. Spróbuj zmienić filtry lub wyczyść je całkowicie.
        </p>
        <Button variant="outline" onClick={handleClearFilter}>
          Wyczyść filtry
        </Button>
      </div>
    );
  }

  return null;
}
