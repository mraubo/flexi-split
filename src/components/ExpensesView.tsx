import { useMemo, useEffect } from "react";
import type { ExpensesQueryState } from "@/types";
import { useExpenses } from "@/components/hooks/useExpenses";
import { useParticipants } from "@/components/hooks/useParticipants";
import { useExpensesFilter } from "@/components/hooks/useExpensesFilter";
import ExpensesFilterBar from "@/components/expenses/ExpensesFilterBar";
import ExpensesDateGroupList from "@/components/expenses/ExpensesDateGroupList";
import ExpensesEmptyState from "@/components/expenses/ExpensesEmptyState";
import ExpensesLoadMore from "@/components/expenses/ExpensesLoadMore";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import { Button } from "@/components/ui/button";
interface ExpensesViewProps {
  settlementId: string;
  isOwner?: boolean;
  isReadOnly: boolean;
}

export default function ExpensesView({ settlementId, isOwner = false, isReadOnly }: ExpensesViewProps) {
  // URL-synchronized filter state
  const { participantId: urlParticipantId } = useExpensesFilter();

  // Initial query state - defaults from plan
  const initialQueryState: ExpensesQueryState = useMemo(
    () => ({
      page: 1,
      limit: 20,
      sort_by: "expense_date",
      sort_order: "desc",
      participantId: urlParticipantId,
    }),
    [urlParticipantId]
  );

  // Get participants for filter
  const { participants, loading: participantsLoading } = useParticipants(settlementId, 0, "open", false);

  // Get expenses with current query state
  const { queryState, setQueryState, groups, loading, error, hasMore, loadMore, refetch } = useExpenses(
    settlementId,
    initialQueryState
  );

  // Sync URL filter changes with expenses query state
  useEffect(() => {
    if (urlParticipantId !== queryState.participantId) {
      setQueryState((prev) => ({
        ...prev,
        participantId: urlParticipantId,
        page: 1, // Reset to first page when filter changes
      }));
    }
  }, [urlParticipantId, queryState.participantId, setQueryState]);

  // Participants are already available from useParticipants hook

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMore();
    }
  };

  // Handle expense deleted
  const handleExpenseDeleted = () => {
    refetch(); // Refresh the list
  };

  // Calculate total expenses amount - must be before any conditional returns
  const totalAmount = useMemo(() => {
    return groups.reduce((total, group) => {
      return total + group.items.reduce((groupTotal, expense) => groupTotal + expense.amountCents, 0);
    }, 0);
  }, [groups]);

  // Handle clear filter
  const handleClearFilter = () => {
    setQueryState((prev) => ({
      ...prev,
      participantId: undefined,
      page: 1, // Reset to first page when clearing filter
    }));
  };

  // Handle error states
  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Koszty</h2>
        <ErrorState message={error.message || "Wystąpił błąd podczas ładowania kosztów"} onRetry={refetch} />
      </div>
    );
  }

  // Show empty state when no participants exist
  const hasNoParticipants = participants.length === 0 && !participantsLoading;

  // Show empty state when no expenses exist and no filters applied
  const hasNoExpenses = groups.length === 0 && !loading && !queryState.participantId && !hasNoParticipants;

  // Show empty state when filtered results are empty
  const hasNoFilteredExpenses = groups.length === 0 && !loading && queryState.participantId && !hasNoParticipants;

  // Format currency
  const formatCurrency = (cents: number): string => {
    const amount = cents / 100;
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Koszty</h2>
          {groups.length > 0 && <p className="text-sm text-gray-500">Suma wydatków: {formatCurrency(totalAmount)}</p>}
        </div>
        {isOwner && !isReadOnly && !hasNoParticipants && (
          <Button
            onClick={() => window.location.assign(`/settlements/${settlementId}/expenses/new`)}
            className="flex items-center gap-2"
          >
            <span>+</span>
            Dodaj wydatek
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      {!hasNoParticipants && <ExpensesFilterBar participants={participants} disabled={participantsLoading} />}

      {/* Loading state for initial load */}
      {loading && groups.length === 0 && <LoadingSkeleton />}

      {/* Empty states */}
      {hasNoParticipants && <ExpensesEmptyState type="no-participants" isOwner={isOwner} isReadOnly={isReadOnly} />}

      {hasNoExpenses && (
        <ExpensesEmptyState type="no-expenses" isOwner={isOwner} isReadOnly={isReadOnly} settlementId={settlementId} />
      )}

      {hasNoFilteredExpenses && (
        <ExpensesEmptyState
          type="no-filtered-expenses"
          isOwner={isOwner}
          isReadOnly={isReadOnly}
          onClearFilter={handleClearFilter}
        />
      )}

      {/* Expenses List */}
      {groups.length > 0 && (
        <>
          <ExpensesDateGroupList
            groups={groups}
            settlementId={settlementId}
            onExpenseDeleted={handleExpenseDeleted}
            isReadOnly={isReadOnly}
          />

          {/* Load More */}
          {hasMore && <ExpensesLoadMore onLoadMore={handleLoadMore} loading={loading} />}
        </>
      )}
    </div>
  );
}
