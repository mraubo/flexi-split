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
import {
  validateAmount,
  validatePayer,
  validateParticipants,
  validateDate,
  validateDescription,
} from "@/lib/utils/validators";

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

      // Use validators from lib/utils/validators
      const amountValidation = validateAmount(state.amountCents);
      if (!amountValidation.valid && amountValidation.error) {
        errors.amount = amountValidation.error;
      }

      const payerValidation = validatePayer(state.payerId, participants);
      if (!payerValidation.valid && payerValidation.error) {
        errors.payer = payerValidation.error;
      }

      const participantsValidation = validateParticipants(state.participantIds);
      if (!participantsValidation.valid && participantsValidation.error) {
        errors.participants = participantsValidation.error;
      }

      // Additional check: all selected participants must exist
      const allParticipantsExist = state.participantIds.every((id) => participants.some((p) => p.id === id));
      if (!allParticipantsExist) {
        errors.participants = "Niektórzy wybrani uczestnicy nie istnieją w rozliczeniu";
      }

      const dateValidation = validateDate(state.date);
      if (!dateValidation.valid && dateValidation.error) {
        errors.date = dateValidation.error;
      }

      const descriptionValidation = validateDescription(state.description);
      if (!descriptionValidation.valid && descriptionValidation.error) {
        errors.description = descriptionValidation.error;
      }

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

  // Submit form using manual fetch (SSR-compatible pattern)
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
