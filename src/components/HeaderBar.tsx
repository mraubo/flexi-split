import NewSettlementButton from "./NewSettlementButton";

interface HeaderBarProps {
  activeCount?: number;
  onNewSettlementClick: () => void;
  limitActive: number;
}

export default function HeaderBar({ activeCount, onNewSettlementClick, limitActive }: HeaderBarProps) {
  const isLimitReached = activeCount !== undefined && activeCount >= limitActive;

  return (
    <div className="py-4" data-testid="header-bar">
      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" data-testid="header-bar-title">
            Rozliczenia
          </h1>
        </div>
        <NewSettlementButton disabled={isLimitReached} onClick={onNewSettlementClick} />
      </div>
      {activeCount !== undefined && (
        <span className="text-sm text-muted-foreground" data-testid="text-active-count">
          {activeCount}/{limitActive} aktywnych
        </span>
      )}
    </div>
  );
}
