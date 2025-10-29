import { useState, useMemo } from "react";
import type { SettlementsTab, SettlementsQueryState, SettlementSummaryDTO } from "@/types";
import { useQueryParamTab } from "@/components/hooks/useQueryParamTab";
import { useSettlementsList } from "@/components/hooks/useSettlementsList";
import { useDeleteSettlement } from "@/components/hooks/useDeleteSettlement";
import TabsSegment from "./TabsSegment";
import HeaderBar from "./HeaderBar";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import EmptyState from "./EmptyState";
import SettlementsList from "./SettlementsList";
import NewSettlementDialog from "./NewSettlementDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

export default function SettlementsPage() {
  const { tab, setTab } = useQueryParamTab();
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    id?: string;
    title?: string;
  }>({ open: false });

  // Derive query state from tab
  const query: SettlementsQueryState = useMemo(
    () => ({
      status: tab === "active" ? "open" : "closed",
      page: 1,
      limit: 20,
      sort_by: "updated_at",
      sort_order: "desc",
    }),
    [tab]
  );

  const settlements = useSettlementsList(query);
  const deleteSettlement = useDeleteSettlement();

  const handleTabChange = (newTab: SettlementsTab) => {
    setTab(newTab);
  };

  const handleNewSettlementClick = () => {
    setNewDialogOpen(true);
  };

  const handleSettlementCreated = (created: SettlementSummaryDTO) => {
    setNewDialogOpen(false);
    window.location.assign(`/settlements/${created.id}`);
  };

  const handleDeleteClick = (id: string, title: string) => {
    setConfirmDelete({ open: true, id, title });
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete.id) {
      try {
        await deleteSettlement.remove(confirmDelete.id);
        setConfirmDelete({ open: false });
        settlements.reload();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Error handled in hook
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <TabsSegment value={tab} onChange={handleTabChange} />
      <HeaderBar
        activeCount={tab === "active" ? settlements.items.length : undefined}
        onNewSettlementClick={handleNewSettlementClick}
        limitActive={3}
      />
      <div className="mt-6">
        {(settlements.initialLoading || settlements.loading) && <LoadingSkeleton />}

        {!settlements.initialLoading && settlements.error && (
          <ErrorState
            message={settlements.error.message || "Wystąpił nieoczekiwany błąd"}
            onRetry={settlements.reload}
          />
        )}

        {!settlements.initialLoading && !settlements.error && settlements.items.length === 0 && (
          <EmptyState
            variant={tab}
            canCreate={tab === "active" && settlements.items.length < 3}
            onCreateClick={handleNewSettlementClick}
          />
        )}

        {!settlements.initialLoading && !settlements.error && settlements.items.length > 0 && (
          <SettlementsList
            items={settlements.items}
            pagination={settlements.pagination}
            loading={settlements.loading}
            onLoadMore={settlements.loadMore}
            onDelete={handleDeleteClick}
          />
        )}
      </div>
      <NewSettlementDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onCreated={handleSettlementCreated} />
      <ConfirmDeleteDialog
        open={confirmDelete.open}
        settlementId={confirmDelete.id}
        settlementTitle={confirmDelete.title}
        onOpenChange={(open) => setConfirmDelete({ open })}
        onDeleted={handleDeleteConfirm}
      />
      {/* TODO: Add ToastsProvider */}
    </div>
  );
}
