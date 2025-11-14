import { useState } from "react";
import { useParticipants, createParticipantsListVM } from "@/components/hooks/useParticipants";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ParticipantsList from "./ParticipantsList";
import ParticipantsEmptyState from "./ParticipantsEmptyState";
import AddParticipantDialog from "./AddParticipantDialog";
import EditParticipantModal from "./EditParticipantModal";
import DeleteParticipantConfirm from "./DeleteParticipantConfirm";
import { getSettlementErrorMessage } from "@/lib/errorMessages";
import type { ParticipantItemVM } from "@/types";

interface ParticipantsViewShellProps {
  settlementId: string;
  isOwner: boolean;
  status: "open" | "closed";
  expensesCount: number;
}

export default function ParticipantsViewShell({
  settlementId,
  isOwner,
  status,
  expensesCount,
}: ParticipantsViewShellProps) {
  const { participants, viewModel, loading, error, add, update, remove, reload } = useParticipants(
    settlementId,
    expensesCount,
    status,
    isOwner
  );

  // Modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantItemVM | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<ParticipantItemVM | null>(null);

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Uczestnicy</h2>
          <div className="text-sm text-gray-500">Ładowanie...</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Uczestnicy</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Wystąpił błąd podczas ładowania uczestników</div>
            <div className="text-sm text-gray-500 mb-4">{getSettlementErrorMessage(error)}</div>
            <button onClick={reload} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!viewModel) {
    return null;
  }

  const participantsListVM = createParticipantsListVM(participants, isOwner, viewModel.isLocked);

  const handleAddParticipantClick = () => {
    setAddDialogOpen(true);
  };

  const handleParticipantCreated = () => {
    // Participant added successfully - hook will reload the list
    setAddDialogOpen(false);
  };

  const handleParticipantUpdated = () => {
    // Participant updated successfully - hook will reload the list
    setEditingParticipant(null); // Close edit modal
  };

  const handleParticipantDeleted = () => {
    // Participant deleted successfully - hook will reload the list
    setDeletingParticipant(null); // Close delete modal
  };

  const handleEditParticipant = (participant: ParticipantItemVM) => {
    setEditingParticipant(participant);
  };

  const handleDeleteParticipant = (participantId: string) => {
    const participant = participantsListVM.items.find((p) => p.id === participantId);
    if (participant) {
      setDeletingParticipant(participant);
    }
  };

  const handleCloseEditModal = () => {
    setEditingParticipant(null);
  };

  const handleCloseDeleteModal = () => {
    setDeletingParticipant(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with step info and counter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Uczestnicy</h2>
          <p className="text-sm text-gray-500">Krok 1 • Zarządzaj listą uczestników rozliczenia</p>
        </div>
        <div className="text-sm text-gray-500">{viewModel.participantsCount}/10 uczestników</div>
      </div>

      {/* Empty State */}
      {viewModel.participantsCount === 0 && !viewModel.isLocked && (
        <ParticipantsEmptyState onCta={handleAddParticipantClick} />
      )}

      {/* Main Content */}
      {viewModel.participantsCount > 0 && (
        <div className="md:bg-white md:rounded-lg md:shadow-sm md:border md:border-gray-200 md:p-6">
          <div className="space-y-6">
            {/* Add Participant Button */}
            {!viewModel.isLocked && (
              <div className="flex justify-end">
                <Button
                  onClick={handleAddParticipantClick}
                  disabled={!participantsListVM.canCreate}
                  className="inline-flex items-center"
                  data-testid="button-add-participant"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj uczestnika
                </Button>
              </div>
            )}

            {/* Participants List */}
            <ParticipantsList
              items={participantsListVM.items}
              onEdit={handleEditParticipant}
              onDelete={handleDeleteParticipant}
              isOwner={isOwner}
              isLocked={viewModel.isLocked}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <AddParticipantDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        existingNicknames={participants.map((p) => p.nickname)}
        onCreated={handleParticipantCreated}
        disabled={!participantsListVM.canCreate}
        addParticipant={add}
      />

      <EditParticipantModal
        participant={editingParticipant}
        existingNicknames={participants.map((p) => p.nickname)}
        onSaved={handleParticipantUpdated}
        onClose={handleCloseEditModal}
        disabled={!viewModel || viewModel.isLocked}
        updateParticipant={update}
      />

      <DeleteParticipantConfirm
        participant={deletingParticipant}
        onDeleted={handleParticipantDeleted}
        onClose={handleCloseDeleteModal}
        disabled={!viewModel || viewModel.isLocked}
        deleteParticipant={remove}
      />
    </div>
  );
}
