import { AlertTriangle, Lock } from "lucide-react";

interface LockBannerProps {
  reason: "closed" | "has_expenses";
  expensesCount?: number;
}

export default function LockBanner({ reason, expensesCount }: LockBannerProps) {
  const getBannerContent = () => {
    switch (reason) {
      case "closed":
        return {
          title: "Rozliczenie jest zamknięte",
          description: "To rozliczenie zostało zamknięte i nie można już wprowadzać zmian w uczestnikach.",
          icon: Lock,
        };
      case "has_expenses":
        return {
          title: "Edycja zablokowana",
          description: `Rozliczenie zawiera już ${expensesCount} ${expensesCount === 1 ? "wydatek" : expensesCount < 5 ? "wydatki" : "wydatków"}. Aby chronić spójność danych, nie można modyfikować listy uczestników.`,
          icon: AlertTriangle,
        };
      default:
        return null;
    }
  };

  const content = getBannerContent();
  if (!content) return null;

  const IconComponent = content.icon;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">{content.title}</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>{content.description}</p>
            {reason === "has_expenses" && (
              <p className="mt-1">
                Jeśli chcesz wprowadzić zmiany, przejdź do zakładki <span className="font-medium">Koszty</span> lub
                utwórz nowe rozliczenie.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
