import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ExpensesLoadMoreProps {
  onLoadMore: () => void;
  loading: boolean;
}

export default function ExpensesLoadMore({ onLoadMore, loading }: ExpensesLoadMoreProps) {
  return (
    <div className="flex justify-center py-6">
      <Button variant="outline" onClick={onLoadMore} disabled={loading} className="min-w-32">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Ładowanie...
          </>
        ) : (
          "Załaduj więcej"
        )}
      </Button>
    </div>
  );
}
