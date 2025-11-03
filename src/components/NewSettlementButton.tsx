import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewSettlementButtonProps {
  disabled: boolean;
  onClick: () => void;
}

export default function NewSettlementButton({ disabled, onClick }: NewSettlementButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled} className="gap-2 cursor-pointer" data-testid="button-new-settlement">
      <Plus className="h-4 w-4" />
      Nowe rozliczenie
    </Button>
  );
}
