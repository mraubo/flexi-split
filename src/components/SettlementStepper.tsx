import type { SettlementStep } from "@/types";

interface SettlementStepperProps {
  activeStep: SettlementStep;
  onStepChange: (step: SettlementStep) => void;
  isReadOnly?: boolean;
}

const steps = [
  { key: "participants" as const, label: "Uczestnicy", description: "Dodaj i zarządzaj uczestnikami rozliczenia" },
  { key: "expenses" as const, label: "Koszty", description: "Dodaj wydatki i przypisz je do osób" },
  { key: "summary" as const, label: "Podsumowanie", description: "Zobacz salda i rozlicz płatności" },
];

export default function SettlementStepper({ activeStep, onStepChange, isReadOnly = false }: SettlementStepperProps) {
  const handleStepClick = (step: SettlementStep) => {
    if (!isReadOnly) {
      onStepChange(step);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, step: SettlementStep) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleStepClick(step);
    }
  };

  return (
    <nav aria-label="Kroki rozliczenia" className="mb-6">
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {steps.map((step) => (
          <button
            key={step.key}
            onClick={() => handleStepClick(step.key)}
            onKeyDown={(e) => handleKeyDown(e, step.key)}
            disabled={isReadOnly}
            className={`
              flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${
                activeStep === step.key
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                  : isReadOnly
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }
            `}
            aria-current={activeStep === step.key ? "step" : undefined}
            aria-disabled={isReadOnly}
          >
            <div className="text-center">
              <div className="font-semibold">{step.label}</div>
              <div className="text-xs mt-1 opacity-75 hidden sm:block">{step.description}</div>
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}
