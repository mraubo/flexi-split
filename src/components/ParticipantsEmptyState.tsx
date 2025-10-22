import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ParticipantsEmptyStateProps {
  onCta: () => void;
}

export default function ParticipantsEmptyState({ onCta }: ParticipantsEmptyStateProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <div className="flex justify-center mb-4">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Brak uczestników</h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        Rozpocznij od dodania uczestników do rozliczenia. Możesz dodać maksymalnie 10 osób. Uczestnicy będą mogli być
        przypisani do wydatków w kolejnych krokach.
      </p>
      <Button onClick={onCta} className="inline-flex items-center">
        <Users className="h-4 w-4 mr-2" />
        Dodaj pierwszego uczestnika
      </Button>
    </div>
  );
}
