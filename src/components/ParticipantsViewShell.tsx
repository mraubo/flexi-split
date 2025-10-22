import { useState } from "react";
import { useParticipants, createParticipantsListVM } from "@/components/hooks/useParticipants";
import ParticipantForm from "./ParticipantForm";
import ParticipantsList from "./ParticipantsList";
import LockBanner from "./LockBanner";
import ParticipantsEmptyState from "./ParticipantsEmptyState";
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

  const handleParticipantCreated = (participant: { id: string; nickname: string }) => {
    // Participant added successfully - hook will reload the list
    console.log("Participant created:", participant);
  };

  const handleParticipantUpdated = (participant: { id: string; nickname: string }) => {
    // Participant updated successfully - hook will reload the list
    console.log("Participant updated:", participant);
    setEditingParticipant(null); // Close edit modal
  };

  const handleParticipantDeleted = (participantId: string) => {
    // Participant deleted successfully - hook will reload the list
    console.log("Participant deleted:", participantId);
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

      {/* Lock Banner */}
      {viewModel.lockReason && <LockBanner reason={viewModel.lockReason} expensesCount={viewModel.expensesCount} />}

      {/* Empty State */}
      {viewModel.participantsCount === 0 && !viewModel.isLocked && (
        <ParticipantsEmptyState
          onCta={() => {
            // Focus on the form input - will be implemented in ParticipantForm
          }}
        />
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* Add Participant Form */}
          <ParticipantForm
            onCreated={handleParticipantCreated}
            disabled={!participantsListVM.canCreate}
            existingNicknames={participants.map((p) => p.nickname)}
            addParticipant={add}
          />

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

      {/* Modals */}
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
