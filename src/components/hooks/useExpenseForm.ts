import { useState, useEffect, useCallback, useRef } from "react";
import type {
  UUID,
  DateString,
  ExpenseDTO,
  ExpenseParticipantMiniDTO,
  ApiError,
  CreateExpenseCommand,
  UpdateExpenseCommand,
} from "@/types";

// Form state type
export interface ExpenseFormVM {
  amountCents?: number;
  payerId?: UUID;
  participantIds: UUID[];
  date?: DateString;
  description?: string | null;
  isValid: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

// Hook parameters
export interface UseExpenseFormParams {
  mode: "create" | "edit";
  settlementId: UUID;
  expenseId?: UUID;
  participants: ExpenseParticipantMiniDTO[];
  initialData?: ExpenseDTO;
  onSaved?: (id: UUID) => void;
}

// Hook return type
export interface UseExpenseFormResult {
  formState: ExpenseFormVM;
  updateField: <K extends keyof ExpenseFormVM>(field: K, value: ExpenseFormVM[K]) => void;
  submitForm: () => Promise<void>;
  cancelForm: () => void;
  apiError: ApiError | null;
}

// Validation helpers
const validateAmount = (amount?: number): string | null => {
  if (!amount) return "Kwota jest wymagana";
  if (amount <= 0) return "Kwota musi być większa od 0";
  if (amount < 1) return "Minimalna kwota to 0,01 PLN";
  return null;
};

const validatePayer = (participants: ExpenseParticipantMiniDTO[], payerId?: UUID): string | null => {
  if (!payerId) return "Wybór płacącego jest wymagany";
  const exists = participants.some((p) => p.id === payerId);
  if (!exists) return "Wybrany płacący nie istnieje w rozliczeniu";
  return null;
};

const validateParticipants = (participantIds: UUID[], participants: ExpenseParticipantMiniDTO[]): string | null => {
  if (participantIds.length === 0) return "Wybierz co najmniej jednego uczestnika";
  const allExist = participantIds.every((id) => participants.some((p) => p.id === id));
  if (!allExist) return "Niektórzy wybrani uczestnicy nie istnieją w rozliczeniu";
  return null;
};

const validateDate = (date?: DateString): string | null => {
  if (!date) return "Data jest wymagana";
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return "Nieprawidłowy format daty";
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "Nieprawidłowa data";
  return null;
};

const validateDescription = (description?: string | null): string | null => {
  if (description && description.length > 140) return "Opis może mieć maksymalnie 140 znaków";
  return null;
};

// Calculate share count and per person amount
export const calculateShareInfo = (amountCents?: number, selectedCount?: number) => {
  if (!amountCents || !selectedCount || selectedCount === 0) {
    return { shareCount: 0, perPersonAmount: 0 };
  }

  const shareCount = selectedCount;
  const totalAmount = amountCents;
  const perPersonAmount = Math.floor(totalAmount / shareCount);

  return { shareCount, perPersonAmount };
};

// Parse amount string to cents
export const parseAmountToCents = (value: string): number | undefined => {
  if (!value.trim()) return undefined;

  // Replace comma with dot for decimal separator
  const normalizedValue = value.replace(",", ".");
  const parsed = parseFloat(normalizedValue);

  if (isNaN(parsed)) return undefined;

  // Convert to cents and round to avoid floating point issues
  return Math.round(parsed * 100);
};

// Format cents to display string
export const formatCentsToAmount = (cents?: number): string => {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
};

export function useExpenseForm(params: UseExpenseFormParams): UseExpenseFormResult {
  const { mode, settlementId, expenseId, participants, initialData, onSaved } = params;

  // Track if initial data has been loaded for edit mode
  const initialDataLoadedRef = useRef(false);

  // Initialize form state
  const [formState, setFormState] = useState<ExpenseFormVM>(() => {
    if (mode === "edit" && initialData) {
      return {
        amountCents: initialData.amount_cents,
        payerId: initialData.payer_participant_id,
        participantIds: initialData.participants.map((p) => p.id),
        date: initialData.expense_date,
        description: initialData.description,
        isValid: true,
        errors: {},
        isSubmitting: false,
      };
    }

    // Default values for create mode
    const defaultParticipantIds = participants.map((p) => p.id);

    return {
      amountCents: undefined,
      payerId: undefined,
      participantIds: defaultParticipantIds, // All participants selected by default
      date: new Date().toISOString().split("T")[0] as DateString, // Today's date
      description: null,
      isValid: false,
      errors: {},
      isSubmitting: false,
    };
  });

  const [apiError, setApiError] = useState<ApiError | null>(null);

  // Validate form and update isValid flag
  const validateForm = useCallback(
    (state: ExpenseFormVM): ExpenseFormVM => {
      const errors: Record<string, string> = {};

      const amountError = validateAmount(state.amountCents);
      if (amountError) errors.amount = amountError;

      const payerError = validatePayer(participants, state.payerId);
      if (payerError) errors.payer = payerError;

      const participantsError = validateParticipants(state.participantIds, participants);
      if (participantsError) errors.participants = participantsError;

      const dateError = validateDate(state.date);
      if (dateError) errors.date = dateError;

      const descriptionError = validateDescription(state.description);
      if (descriptionError) errors.description = descriptionError;

      const isValid = Object.keys(errors).length === 0;

      return {
        ...state,
        errors,
        isValid,
      };
    },
    [participants]
  );

  // Update field and revalidate
  const updateField = useCallback(
    <K extends keyof ExpenseFormVM>(field: K, value: ExpenseFormVM[K]) => {
      setFormState((currentState) => {
        const newState = { ...currentState, [field]: value };
        const validated = validateForm(newState);
        return validated;
      });
      setApiError(null); // Clear API errors when user changes fields
    },
    [validateForm]
  );

  // Submit form
  const submitForm = useCallback(async () => {
    if (!formState.isValid || formState.isSubmitting) return;

    setFormState((prev) => ({ ...prev, isSubmitting: true }));
    setApiError(null);

    try {
      // Validate required fields before submission
      if (!formState.payerId || !formState.amountCents || !formState.date) {
        throw new Error("Form validation failed - required fields are missing");
      }

      const command: CreateExpenseCommand | UpdateExpenseCommand = {
        payer_participant_id: formState.payerId,
        amount_cents: formState.amountCents,
        expense_date: formState.date,
        description: formState.description || null,
        participant_ids: formState.participantIds,
      };

      const url =
        mode === "create"
          ? `/api/settlements/${settlementId}/expenses`
          : `/api/settlements/${settlementId}/expenses/${expenseId}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: ApiError = {
          status: response.status,
          code: errorData.error?.code,
          message: errorData.error?.message || "Wystąpił błąd podczas zapisywania wydatku",
          details: errorData.error?.details,
        };

        // Map specific errors to form fields for better UX
        if (error.code === "invalid_payer") {
          updateField("payerId", undefined);
        } else if (error.code === "invalid_participants") {
          updateField("participantIds", []);
        } else if (error.code === "settlement_closed") {
          // This will be handled by the UI locking mechanism
        }

        // For validation errors, try to map specific field errors
        if (error.code === "validation_error" && error.details && typeof error.details === "object") {
          const details = error.details as { pointer?: string };
          // Handle specific validation errors that map to fields
          if (details.pointer === "/payer_participant_id") {
            updateField("payerId", undefined);
          } else if (details.pointer === "/participant_ids") {
            updateField("participantIds", []);
          } else if (details.pointer === "/amount_cents") {
            updateField("amountCents", undefined);
          } else if (details.pointer === "/expense_date") {
            updateField("date", undefined);
          }
        }

        throw error;
      }

      const result = await response.json();

      // Call onSaved callback with the expense ID
      if (onSaved) {
        onSaved(result.id || result.expense_id);
      }
    } catch (error) {
      setApiError(error as ApiError);
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [formState, mode, settlementId, expenseId, onSaved, updateField]);

  // Cancel form - could be used for navigation
  const cancelForm = useCallback(() => {
    // This could trigger navigation back to the expenses list
    // For now, just clear any errors
    setApiError(null);
  }, []);

  // Re-validate when participants change (e.g., when settlement data is refreshed)
  // Skip in edit mode after initial data is loaded to avoid overwriting payerId
  useEffect(() => {
    if (mode !== "edit" || !initialDataLoadedRef.current) {
      setFormState((currentState) => {
        const validated = validateForm(currentState);
        return validated;
      });
    }
  }, [participants, validateForm, mode]);

  // Update form state when initialData is loaded for edit mode
  useEffect(() => {
    if (mode === "edit" && initialData && participants.length > 0 && !initialDataLoadedRef.current) {
      const newState: ExpenseFormVM = {
        amountCents: initialData.amount_cents,
        payerId: initialData.payer_participant_id,
        participantIds: initialData.participants.map((p) => p.id),
        date: initialData.expense_date,
        description: initialData.description,
        isValid: true,
        errors: {},
        isSubmitting: false,
      };

      // Validate the new state immediately
      const validatedState = validateForm(newState);

      // Mark as loaded BEFORE setting state to prevent race conditions
      initialDataLoadedRef.current = true;
      setFormState(validatedState);
    }
  }, [mode, initialData, validateForm, participants]);

  // Update participantIds when participants are loaded for create mode
  useEffect(() => {
    if (mode === "create" && participants.length > 0) {
      setFormState((currentState) => {
        // Only auto-select all participants if none are currently selected (first load)
        // or if the participant list has changed (someone was added/removed from settlement)
        const allParticipantIds = participants.map((p) => p.id);
        const shouldAutoSelect =
          currentState.participantIds.length === 0 || // First load - no participants selected yet
          !currentState.participantIds.every((id) => allParticipantIds.includes(id)) || // Some selected participants no longer exist
          currentState.participantIds.length < allParticipantIds.length; // New participants were added

        if (shouldAutoSelect) {
          const newState = { ...currentState, participantIds: allParticipantIds };
          return validateForm(newState);
        }
        return currentState;
      });
    }
  }, [participants, mode, validateForm]);

  return {
    formState,
    updateField,
    submitForm,
    cancelForm,
    apiError,
  };
}
