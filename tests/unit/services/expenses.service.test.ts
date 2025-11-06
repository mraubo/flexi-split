import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GetExpensesQuery, CreateExpenseCommand, UpdateExpenseCommand } from "@/types";
import {
  getExpenses,
  deleteExpense,
  createExpense,
  updateExpense,
  readExpenseWithParticipants,
} from "@/lib/services/expenses.service";

// Mock settlements service
vi.mock("@/lib/services/settlements.service", () => ({
  checkAccessOrExistence: vi.fn(),
  checkSettlementParticipation: vi.fn(),
}));

import { checkAccessOrExistence, checkSettlementParticipation } from "@/lib/services/settlements.service";

// Test data fixtures
const mockUserId = "user-123";
const mockSettlementId = "settlement-456";
const mockExpenseId = "expense-789";
const mockParticipantId = "participant-111";
const mockPayerId = "participant-222";

const mockExpenseRow = {
  id: mockExpenseId,
  payer_participant_id: mockPayerId,
  amount_cents: 5000,
  expense_date: "2024-01-15",
  description: "Dinner at restaurant",
  share_count: 3,
  created_at: "2024-01-15T20:00:00Z",
  updated_at: "2024-01-15T20:00:00Z",
  last_edited_by: mockUserId,
};

const mockParticipants = [
  { id: "participant-111", nickname: "alice" },
  { id: "participant-222", nickname: "bob" },
  { id: "participant-333", nickname: "charlie" },
];

const mockExpenseParticipantsData = [
  { expense_id: mockExpenseId, participants: { id: "participant-111", nickname: "alice" } },
  { expense_id: mockExpenseId, participants: { id: "participant-222", nickname: "bob" } },
  { expense_id: mockExpenseId, participants: { id: "participant-333", nickname: "charlie" } },
];

describe("expenses.service", () => {
  let mockSupabase: SupabaseClient<Database>;
  let fromMock: any;
  let rpcMock: any;
  const mockCheckAccess = checkAccessOrExistence as ReturnType<typeof vi.fn>;
  const mockCheckParticipation = checkSettlementParticipation as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    fromMock = vi.fn();
    rpcMock = vi.fn();
    mockSupabase = {
      from: fromMock,
      rpc: rpcMock,
    } as unknown as SupabaseClient<Database>;
  });

  describe("getExpenses", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should retrieve expenses with default parameters", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();
      const inMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: fetch expenses
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock.mockReturnValue({
                range: rangeMock.mockResolvedValue({
                  data: [mockExpenseRow],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: fetch expense participants
          select: vi.fn().mockReturnValue({
            in: inMock.mockResolvedValue({
              data: mockExpenseParticipantsData,
              error: null,
            }),
          }),
        });

      // Act
      const result = await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(eqMock).toHaveBeenCalledWith("settlement_id", mockSettlementId);
      expect(orderMock).toHaveBeenCalledWith("expense_date", { ascending: false });
      expect(rangeMock).toHaveBeenCalledWith(0, 49); // Default limit 50
      expect(result.data).toHaveLength(1);
      expect(result.data[0].participants).toHaveLength(3);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 1,
        total_pages: 1,
      });
    });

    it("should apply custom pagination", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
        page: 2,
        limit: 10,
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();
      const inMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: fetch expenses
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock.mockReturnValue({
                range: rangeMock.mockResolvedValue({
                  data: [mockExpenseRow],
                  count: 15,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: fetch expense participants
          select: vi.fn().mockReturnValue({
            in: inMock.mockResolvedValue({
              data: mockExpenseParticipantsData,
              error: null,
            }),
          }),
        });

      // Act
      const result = await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(rangeMock).toHaveBeenCalledWith(10, 19); // Page 2, offset 10
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.total_pages).toBe(2);
    });

    it("should sort by amount_cents ascending", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
        sort_by: "amount_cents",
        sort_order: "asc",
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock.mockReturnValue({
                range: rangeMock.mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      // Act
      await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("amount_cents", { ascending: true });
    });

    it("should filter by participant_id", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
        participant_id: mockParticipantId,
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orMock = vi.fn();
      const singleMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();
      const inMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Check participant exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: { id: mockParticipantId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Fetch expenses with participant filter
          // Chain: .select().eq().order().range().or()
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                order: orderMock.mockReturnValue({
                  range: rangeMock.mockReturnValue({
                    or: orMock.mockResolvedValue({
                      data: [],
                      count: 0,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        } else {
          // Third call: fetch expense participants (empty result)
          return {
            select: vi.fn().mockReturnValue({
              in: inMock.mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
      });

      // Act
      await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(singleMock).toHaveBeenCalled();
      expect(orMock).toHaveBeenCalledWith(
        `payer_participant_id.eq.${mockParticipantId},expense_participants.participant_id.eq.${mockParticipantId}`
      );
    });

    it("should throw error when participant not found", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
        participant_id: "non-existent",
      };

      const singleMock = vi.fn();
      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getExpenses(mockSupabase, query, mockUserId)).rejects.toThrow("Participant not found");
    });

    it("should filter by date range", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
        date_from: "2024-01-01",
        date_to: "2024-01-31",
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const gteMock = vi.fn();
      const lteMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: fetch expenses with date filters
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              order: orderMock.mockReturnValue({
                range: rangeMock.mockReturnValue({
                  gte: gteMock.mockReturnValue({
                    lte: lteMock.mockResolvedValue({
                      data: [],
                      count: 0,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        });

      // Act
      await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(gteMock).toHaveBeenCalledWith("expense_date", "2024-01-01");
      expect(lteMock).toHaveBeenCalledWith("expense_date", "2024-01-31");
    });

    it("should handle empty result set", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockResolvedValue({
                data: [],
                count: 0,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await getExpenses(mockSupabase, query, mockUserId);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
      };

      // Act & Assert
      await expect(getExpenses(mockSupabase, query, mockUserId)).rejects.toThrow("Settlement not found");
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
      };

      // Act & Assert
      await expect(getExpenses(mockSupabase, query, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error on database failure", async () => {
      // Arrange
      const query: GetExpensesQuery & { settlement_id: string } = {
        settlement_id: mockSettlementId,
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockResolvedValue({
                data: null,
                count: null,
                error: new Error("Database error"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getExpenses(mockSupabase, query, mockUserId)).rejects.toThrow("Database error");
    });
  });

  describe("deleteExpense", () => {
    beforeEach(() => {
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "open" });
    });

    it("should delete expense successfully", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const deleteMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // Check expense exists
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { id: mockExpenseId },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Delete expense_participants
          delete: deleteMock.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Delete expense
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(mockCheckParticipation).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(result).toEqual({ type: "ok" });
      expect(deleteMock).toHaveBeenCalled();
    });

    it("should return not_found when settlement does not exist", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: false, accessible: false, status: null });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(result).toEqual({ type: "not_found" });
    });

    it("should return forbidden when user is not participant", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: false, status: null });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(result).toEqual({ type: "forbidden" });
    });

    it("should return closed when settlement is not open", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "closed" });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(result).toEqual({ type: "closed" });
    });

    it("should return not_found when expense does not exist", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(result).toEqual({ type: "not_found" });
    });

    it("should return error when delete fails", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const deleteMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { id: mockExpenseId },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          delete: deleteMock.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error("Delete failed"),
            }),
          }),
        });

      // Act
      const result = await deleteExpense(mockSupabase, mockSettlementId, mockExpenseId, mockUserId);

      // Assert
      expect(result).toEqual({ type: "error", message: "Failed to delete expense participants: Delete failed" });
    });
  });

  describe("createExpense", () => {
    beforeEach(() => {
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "open" });
    });

    it("should create expense successfully", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 6000,
        expense_date: "2024-01-20",
        description: "Lunch",
        participant_ids: [mockParticipantId, mockPayerId],
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const inMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // Check payer exists
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { id: mockPayerId },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Check all participants exist
          select: vi.fn().mockReturnValue({
            in: inMock.mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: mockParticipantId }, { id: mockPayerId }],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Fetch participants for response
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { participants: { id: mockParticipantId, nickname: "alice" } },
                { participants: { id: mockPayerId, nickname: "bob" } },
              ],
              error: null,
            }),
          }),
        });

      rpcMock.mockResolvedValue({
        data: {
          id: mockExpenseId,
          payer_participant_id: mockPayerId,
          amount_cents: 6000,
          expense_date: "2024-01-20",
          description: "Lunch",
          share_count: 2,
          created_at: "2024-01-20T12:00:00Z",
          updated_at: "2024-01-20T12:00:00Z",
          last_edited_by: mockUserId,
        },
        error: null,
      });

      // Act
      const result = await createExpense(mockSupabase, mockSettlementId, command, mockUserId);

      // Assert
      expect(mockCheckParticipation).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(rpcMock).toHaveBeenCalledWith("create_expense_with_participants", {
        expense_data: {
          settlement_id: mockSettlementId,
          payer_participant_id: mockPayerId,
          amount_cents: 6000,
          expense_date: "2024-01-20",
          description: "Lunch",
          last_edited_by: mockUserId,
        },
        expense_participants_data: expect.arrayContaining([
          { participant_id: mockParticipantId },
          { participant_id: mockPayerId },
        ]),
        user_id: mockUserId,
      });
      expect(result.id).toBe(mockExpenseId);
      expect(result.participants).toHaveLength(2);
    });

    it("should add payer to participants if not included", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId], // Payer not included
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const inMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Check payer exists
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: { id: mockPayerId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Validate participants exist - only mockParticipantId is checked initially
          return {
            select: vi.fn().mockReturnValue({
              in: inMock.mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: mockParticipantId }],
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Fetch participants for response - both should be present after payer is added
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { participants: { id: mockParticipantId, nickname: "alice" } },
                  { participants: { id: mockPayerId, nickname: "bob" } },
                ],
                error: null,
              }),
            }),
          };
        }
      });

      rpcMock.mockResolvedValue({
        data: {
          id: mockExpenseId,
          payer_participant_id: mockPayerId,
          amount_cents: 5000,
          expense_date: "2024-01-20",
          description: "Coffee",
          share_count: 2,
          created_at: "2024-01-20T12:00:00Z",
          updated_at: "2024-01-20T12:00:00Z",
          last_edited_by: mockUserId,
        },
        error: null,
      });

      // Act
      await createExpense(mockSupabase, mockSettlementId, command, mockUserId);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith(
        "create_expense_with_participants",
        expect.objectContaining({
          expense_participants_data: expect.arrayContaining([
            { participant_id: mockParticipantId },
            { participant_id: mockPayerId }, // Payer should be added
          ]),
        })
      );
    });

    it("should remove duplicate participant IDs", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId, mockParticipantId, mockPayerId], // Duplicates
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const inMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { id: mockPayerId },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            in: inMock.mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: mockParticipantId }, { id: mockPayerId }],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      rpcMock.mockResolvedValue({
        data: {
          id: mockExpenseId,
          payer_participant_id: mockPayerId,
          amount_cents: 5000,
          expense_date: "2024-01-20",
          description: "Coffee",
          share_count: 2,
          created_at: "2024-01-20T12:00:00Z",
          updated_at: "2024-01-20T12:00:00Z",
          last_edited_by: mockUserId,
        },
        error: null,
      });

      // Act
      await createExpense(mockSupabase, mockSettlementId, command, mockUserId);

      // Assert
      const rpcCall = rpcMock.mock.calls[0][1];
      expect(rpcCall.expense_participants_data).toHaveLength(2); // Only unique participants
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: false, accessible: false, status: null });
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user is not participant", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: false, status: null });
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when settlement is closed", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "closed" });
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Settlement is closed - cannot add expenses"
      );
    });

    it("should throw error when payer does not exist", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: "non-existent",
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Payer participant does not exist in settlement"
      );
    });

    it("should throw error when some participants do not exist", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId, "non-existent"],
      };

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const inMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Check payer exists
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: { id: mockPayerId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          // Validate participants - only return 2 out of 3 requested (missing "non-existent")
          // uniqueParticipantIds = [mockParticipantId, "non-existent"]
          // After validation, only mockParticipantId is found
          return {
            select: vi.fn().mockReturnValue({
              in: inMock.mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: mockParticipantId }], // Only 1 found out of 2 requested
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Some participants do not exist in settlement"
      );
    });

    it("should map RPC error code P0001 to settlement not found", async () => {
      // Arrange
      const command: CreateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId, mockPayerId],
      };

      let callCount = 0;
      fromMock.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // Check payer exists
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: mockPayerId },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          // Validate participants exist - return both to pass validation
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: mockParticipantId }, { id: mockPayerId }],
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      rpcMock.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "Error" },
      });

      // Act & Assert
      await expect(createExpense(mockSupabase, mockSettlementId, command, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });
  });

  describe("updateExpense", () => {
    beforeEach(() => {
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "open" });
    });

    it("should update expense successfully", async () => {
      // Arrange
      const command: UpdateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 7000,
        expense_date: "2024-01-21",
        description: "Updated dinner",
        participant_ids: [mockParticipantId, mockPayerId],
      };

      const inMock = vi.fn();

      fromMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { participants: { id: mockParticipantId, nickname: "alice" } },
              { participants: { id: mockPayerId, nickname: "bob" } },
            ],
            error: null,
          }),
        }),
      });

      rpcMock.mockResolvedValue({
        data: {
          id: mockExpenseId,
          payer_participant_id: mockPayerId,
          amount_cents: 7000,
          expense_date: "2024-01-21",
          description: "Updated dinner",
          share_count: 2,
          created_at: "2024-01-15T20:00:00Z",
          updated_at: "2024-01-21T12:00:00Z",
          last_edited_by: mockUserId,
        },
        error: null,
      });

      // Act
      const result = await updateExpense(mockSupabase, mockSettlementId, mockExpenseId, command, mockUserId);

      // Assert
      expect(mockCheckParticipation).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(rpcMock).toHaveBeenCalledWith("update_expense_with_participants", {
        p_expense_id: mockExpenseId,
        expense_data: {
          payer_participant_id: mockPayerId,
          amount_cents: 7000,
          expense_date: "2024-01-21",
          description: "Updated dinner",
        },
        expense_participants_data: expect.arrayContaining([
          { participant_id: mockParticipantId },
          { participant_id: mockPayerId },
        ]),
        user_id: mockUserId,
      });
      expect(result.amount_cents).toBe(7000);
      expect(result.description).toBe("Updated dinner");
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: false, accessible: false, status: null });
      const command: UpdateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      // Act & Assert
      await expect(
        updateExpense(mockSupabase, mockSettlementId, mockExpenseId, command, mockUserId)
      ).rejects.toThrow("Settlement not found");
    });

    it("should throw error when settlement is closed", async () => {
      // Arrange
      mockCheckParticipation.mockResolvedValue({ exists: true, accessible: true, status: "closed" });
      const command: UpdateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      // Act & Assert
      await expect(
        updateExpense(mockSupabase, mockSettlementId, mockExpenseId, command, mockUserId)
      ).rejects.toThrow("Settlement is closed - cannot update expenses");
    });

    it("should map RPC error code P0001 to expense not found", async () => {
      // Arrange
      const command: UpdateExpenseCommand = {
        payer_participant_id: mockPayerId,
        amount_cents: 5000,
        expense_date: "2024-01-20",
        description: "Coffee",
        participant_ids: [mockParticipantId],
      };

      rpcMock.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "Error" },
      });

      // Act & Assert
      await expect(
        updateExpense(mockSupabase, mockSettlementId, mockExpenseId, command, mockUserId)
      ).rejects.toThrow("Expense not found");
    });
  });

  describe("readExpenseWithParticipants", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should retrieve expense with participants", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // Fetch expense
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockExpenseRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Fetch participants
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockExpenseParticipantsData,
              error: null,
            }),
          }),
        });

      // Act
      const result = await readExpenseWithParticipants(
        mockSupabase,
        mockSettlementId,
        mockExpenseId,
        mockUserId
      );

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(result.id).toBe(mockExpenseId);
      expect(result.participants).toHaveLength(3);
      expect(result.participants[0]).toEqual({ id: "participant-111", nickname: "alice" });
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });

      // Act & Assert
      await expect(
        readExpenseWithParticipants(mockSupabase, mockSettlementId, mockExpenseId, mockUserId)
      ).rejects.toThrow("Settlement not found");
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });

      // Act & Assert
      await expect(
        readExpenseWithParticipants(mockSupabase, mockSettlementId, mockExpenseId, mockUserId)
      ).rejects.toThrow("Forbidden: insufficient permissions");
    });

    it("should throw error when expense not found", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(
        readExpenseWithParticipants(mockSupabase, mockSettlementId, mockExpenseId, mockUserId)
      ).rejects.toThrow("Expense not found");
    });

    it("should handle expense with no participants", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockExpenseRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        });

      // Act
      const result = await readExpenseWithParticipants(
        mockSupabase,
        mockSettlementId,
        mockExpenseId,
        mockUserId
      );

      // Assert
      expect(result.participants).toEqual([]);
    });
  });
});
