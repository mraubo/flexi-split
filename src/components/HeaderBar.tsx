import NewSettlementButton from "./NewSettlementButton";

interface HeaderBarProps {
  activeCount?: number;
  onNewSettlementClick: () => void;
  limitActive: number;
}

export default function HeaderBar({ activeCount, onNewSettlementClick, limitActive }: HeaderBarProps) {
  const isLimitReached = activeCount !== undefined && activeCount >= limitActive;

  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Rozliczenia</h1>
        {activeCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            {activeCount}/{limitActive} aktywnych
          </span>
        )}
      </div>
      <NewSettlementButton disabled={isLimitReached} onClick={onNewSettlementClick} />
    </div>
  );
}

