import { useState, useEffect } from "react";

type SettlementStep = "participants" | "expenses" | "summary";

export function useQueryParamStep(): {
  step: SettlementStep;
  setStep: (step: SettlementStep) => void;
} {
  const [step, setStepState] = useState<SettlementStep>("participants");

  // Read step from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get("step");
    if (stepParam === "participants" || stepParam === "expenses" || stepParam === "summary") {
      setStepState(stepParam);
    }
  }, []);

  // Update URL when step changes
  const setStep = (newStep: SettlementStep) => {
    setStepState(newStep);
    const url = new URL(window.location.href);
    url.searchParams.set("step", newStep);
    window.history.replaceState({}, "", url.toString());
  };

  return { step, setStep };
}
