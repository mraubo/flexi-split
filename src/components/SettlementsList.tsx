import { Button } from "@/components/ui/button";
import SettlementCard from "./SettlementCard";
import type { SettlementCardVM, PaginationMeta } from "@/types";

interface SettlementsListProps {
  items: SettlementCardVM[];
  pagination: PaginationMeta;
  loading: boolean;
  onLoadMore: () => void;
  onDelete: (id: string, title: string) => void;
}

export default function SettlementsList({ items, pagination, loading, onLoadMore, onDelete }: SettlementsListProps) {
  const hasMore = pagination.page < pagination.total_pages;

  return (
    <div className="space-y-4">
      <div role="list" className="space-y-3" data-testid="list-settlements">
        {items.map((item) => (
          <div key={item.id} role="listitem">
            <SettlementCard item={item} onDelete={onDelete} />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button onClick={onLoadMore} disabled={loading} variant="outline" data-testid="button-load-more">
            {loading ? "Ładowanie..." : "Załaduj więcej"}
          </Button>
        </div>
      )}
    </div>
  );
}
