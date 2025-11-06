import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GetSettlementsQuery, CreateSettlementCommand } from "@/types";
import {
  listSettlements,
  deleteSettlementSoft,
  getSettlementById,
  checkAccessOrExistence,
  checkSettlementParticipation,
  createSettlement,
  updateSettlementTitle,
  getSettlementSnapshot,
} from "@/lib/services/settlements.service";

// Mock the participants service to avoid circular dependencies
vi.mock("@/lib/services/participants.service", () => ({
  addParticipant: vi.fn(),
}));

import { addParticipant } from "@/lib/services/participants.service";

// Test data fixtures
const mockUserId = "user-123";
const mockUserEmail = "test@example.com";
const mockSettlementId = "settlement-456";

const mockSettlementRow = {
  id: mockSettlementId,
  title: "Trip to Mountains",
  status: "open" as const,
  currency: "PLN",
  participants_count: 3,
  expenses_count: 5,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  closed_at: null,
  last_edited_by: mockUserId,
  deleted_at: null,
  owner_id: mockUserId,
};

const mockSettlementWithExpenses = {
  ...mockSettlementRow,
  expenses: [{ amount_cents: 1000 }, { amount_cents: 2000 }, { amount_cents: 1500 }],
};

describe("settlements.service", () => {
  let mockSupabase: SupabaseClient<Database>;
  let fromMock: any;
  let rpcMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks for each test
    fromMock = vi.fn();
    rpcMock = vi.fn();

    mockSupabase = {
      from: fromMock,
      rpc: rpcMock,
    } as unknown as SupabaseClient<Database>;
  });

  describe("listSettlements", () => {
    it("should list settlements with default pagination", async () => {
      // Arrange
      const query: GetSettlementsQuery = {};
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [mockSettlementWithExpenses],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(fromMock).toHaveBeenCalledWith("settlements");
      expect(isNullMock).toHaveBeenCalledWith("deleted_at", null);
      expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(rangeMock).toHaveBeenCalledWith(0, 19); // Default page 1, limit 20
      expect(eqMock).toHaveBeenCalledWith("owner_id", mockUserId);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        ...mockSettlementRow,
        total_expenses_amount_cents: 4500,
      });
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      });
    });

    it("should list settlements with custom pagination", async () => {
      // Arrange
      const query: GetSettlementsQuery = { page: 2, limit: 10 };
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [],
                  count: 5,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(rangeMock).toHaveBeenCalledWith(10, 19); // Page 2, offset 10
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 5,
        total_pages: 1,
      });
    });

    it("should filter by status", async () => {
      // Arrange
      const query: GetSettlementsQuery = { status: "closed" };
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      const eqStatusMock = vi.fn();
      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqStatusMock.mockReturnValue({
                  eq: eqMock.mockResolvedValue({
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
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(eqStatusMock).toHaveBeenCalledWith("status", "closed");
      expect(result.data).toEqual([]);
    });

    it("should sort by title ascending", async () => {
      // Arrange
      const query: GetSettlementsQuery = { sort_by: "title", sort_order: "asc" };
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(orderMock).toHaveBeenCalledWith("title", { ascending: true });
    });

    it("should calculate total expenses correctly", async () => {
      // Arrange
      const query: GetSettlementsQuery = {};
      const settlementWithManyExpenses = {
        ...mockSettlementRow,
        expenses: [{ amount_cents: 100 }, { amount_cents: 200 }, { amount_cents: 300 }, { amount_cents: 400 }],
      };
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [settlementWithManyExpenses],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(result.data[0].total_expenses_amount_cents).toBe(1000);
    });

    it("should handle settlement with no expenses", async () => {
      // Arrange
      const query: GetSettlementsQuery = {};
      const settlementNoExpenses = {
        ...mockSettlementRow,
        expenses: null,
      };
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [settlementNoExpenses],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(result.data[0].total_expenses_amount_cents).toBe(0);
    });

    it("should handle empty result set", async () => {
      // Arrange
      const query: GetSettlementsQuery = {};
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: [],
                  count: 0,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listSettlements(mockSupabase, query, mockUserId);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.total_pages).toBe(1); // At least 1 page even if empty
    });

    it("should throw error on database failure", async () => {
      // Arrange
      const query: GetSettlementsQuery = {};
      const dbError = new Error("Database connection failed");
      const selectMock = vi.fn();
      const isNullMock = vi.fn();
      const orderMock = vi.fn();
      const eqMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          is: isNullMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockReturnValue({
                eq: eqMock.mockResolvedValue({
                  data: null,
                  count: null,
                  error: dbError,
                }),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(listSettlements(mockSupabase, query, mockUserId)).rejects.toThrow("Database connection failed");
    });
  });

  describe("deleteSettlementSoft", () => {
    it("should soft delete a closed settlement", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const updateMock = vi.fn();
      const updateEqMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: fetch settlement
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              is: isNullMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { ...mockSettlementRow, status: "closed" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: update
          update: updateMock.mockReturnValue({
            eq: updateEqMock.mockResolvedValue({
              error: null,
            }),
          }),
        });

      // Act
      await deleteSettlementSoft(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(selectMock).toHaveBeenCalledWith("id, owner_id, status, deleted_at");
      expect(eqMock).toHaveBeenCalledWith("id", mockSettlementId);
      expect(isNullMock).toHaveBeenCalledWith("deleted_at", null);
      expect(updateMock).toHaveBeenCalledWith({
        deleted_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        last_edited_by: mockUserId,
      });
      expect(updateEqMock).toHaveBeenCalledWith("id", mockSettlementId);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(deleteSettlementSoft(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user is not owner", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, owner_id: "different-user", status: "closed" },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(deleteSettlementSoft(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when settlement is not closed", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, status: "open" },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(deleteSettlementSoft(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Unprocessable Content: settlement is not closed"
      );
    });

    it("should throw error when update fails", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const updateMock = vi.fn();
      const updateEqMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              is: isNullMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { ...mockSettlementRow, status: "closed" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: updateMock.mockReturnValue({
            eq: updateEqMock.mockResolvedValue({
              error: new Error("Update failed"),
            }),
          }),
        });

      // Act & Assert
      await expect(deleteSettlementSoft(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow("Update failed");
    });
  });

  describe("getSettlementById", () => {
    it("should retrieve settlement by ID", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: mockSettlementWithExpenses,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await getSettlementById(mockSupabase, mockSettlementId);

      // Assert
      expect(eqMock).toHaveBeenCalledWith("id", mockSettlementId);
      expect(isNullMock).toHaveBeenCalledWith("deleted_at", null);
      expect(result).toMatchObject({
        ...mockSettlementRow,
        total_expenses_amount_cents: 4500,
      });
    });

    it("should calculate total expenses as 0 when no expenses", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, expenses: null },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await getSettlementById(mockSupabase, mockSettlementId);

      // Assert
      expect(result.total_expenses_amount_cents).toBe(0);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getSettlementById(mockSupabase, mockSettlementId)).rejects.toThrow("Settlement not found");
    });

    it("should throw database error", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: new Error("Database error"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getSettlementById(mockSupabase, mockSettlementId)).rejects.toThrow("Database error");
    });
  });

  describe("checkAccessOrExistence", () => {
    it("should return exists and accessible when user owns settlement", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true },
        error: null,
      });

      // Act
      const result = await checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith("check_settlement_access", {
        p_settlement_id: mockSettlementId,
        p_user_id: mockUserId,
      });
      expect(result).toEqual({ exists: true, accessible: true });
    });

    it("should return exists but not accessible when user does not own", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: false },
        error: null,
      });

      // Act
      const result = await checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({ exists: true, accessible: false });
    });

    it("should return not exists when settlement not found", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: false, accessible: false },
        error: null,
      });

      // Act
      const result = await checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({ exists: false, accessible: false });
    });

    it("should throw error when RPC fails", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      // Act & Assert
      await expect(checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "RPC function check_settlement_access failed: RPC failed"
      );
    });

    it("should throw error when response is invalid", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Invalid response from check_settlement_access"
      );
    });

    it("should throw error when response is not an object", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: "invalid",
        error: null,
      });

      // Act & Assert
      await expect(checkAccessOrExistence(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Invalid response from check_settlement_access"
      );
    });
  });

  describe("checkSettlementParticipation", () => {
    it("should return participation data for participant", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true, status: "open" },
        error: null,
      });

      // Act
      const result = await checkSettlementParticipation(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith("check_settlement_participation", {
        p_settlement_id: mockSettlementId,
        p_user_id: mockUserId,
      });
      expect(result).toEqual({ exists: true, accessible: true, status: "open" });
    });

    it("should return closed status for closed settlement", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true, status: "closed" },
        error: null,
      });

      // Act
      const result = await checkSettlementParticipation(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({ exists: true, accessible: true, status: "closed" });
    });

    it("should return not accessible when user is not participant", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: false, status: null },
        error: null,
      });

      // Act
      const result = await checkSettlementParticipation(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({ exists: true, accessible: false, status: null });
    });

    it("should throw error when RPC fails", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      // Act & Assert
      await expect(checkSettlementParticipation(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "RPC function check_settlement_participation failed: RPC failed"
      );
    });

    it("should throw error when response is invalid", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act & Assert
      await expect(checkSettlementParticipation(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Invalid response from check_settlement_participation"
      );
    });
  });

  describe("createSettlement", () => {
    const mockAddParticipant = addParticipant as ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockAddParticipant.mockClear();
    });

    it("should create settlement with owner participant", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
        ownerNickname: "john",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: insert
          insert: insertMock.mockReturnValue({
            select: selectMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, participants_count: 0 },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: fetch updated
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockSettlementRow, participants_count: 1 },
                error: null,
              }),
            }),
          }),
        });

      mockAddParticipant.mockResolvedValue({
        id: "participant-1",
        nickname: "john",
        is_owner: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        last_edited_by: mockUserId,
      });

      // Act
      const result = await createSettlement(mockSupabase, command, mockUserId, mockUserEmail);

      // Assert
      expect(insertMock).toHaveBeenCalledWith([
        {
          title: "Weekend Trip",
          owner_id: mockUserId,
        },
      ]);
      expect(mockAddParticipant).toHaveBeenCalledWith(mockSupabase, mockSettlementRow.id, "john", mockUserId, true);
      expect(result.total_expenses_amount_cents).toBe(0);
      expect(result.participants_count).toBe(1);
    });

    it("should use email prefix as default nickname when ownerNickname not provided", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          insert: insertMock.mockReturnValue({
            select: selectMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: mockSettlementRow,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettlementRow,
                error: null,
              }),
            }),
          }),
        });

      mockAddParticipant.mockResolvedValue({
        id: "participant-1",
        nickname: "test",
        is_owner: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        last_edited_by: mockUserId,
      });

      // Act
      await createSettlement(mockSupabase, command, mockUserId, mockUserEmail);

      // Assert
      expect(mockAddParticipant).toHaveBeenCalledWith(
        mockSupabase,
        mockSettlementRow.id,
        "test", // From test@example.com
        mockUserId,
        true
      );
    });

    it("should use 'Owner' as default when no email provided", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          insert: insertMock.mockReturnValue({
            select: selectMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: mockSettlementRow,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSettlementRow,
                error: null,
              }),
            }),
          }),
        });

      mockAddParticipant.mockResolvedValue({
        id: "participant-1",
        nickname: "Owner",
        is_owner: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        last_edited_by: mockUserId,
      });

      // Act
      await createSettlement(mockSupabase, command, mockUserId);

      // Assert
      expect(mockAddParticipant).toHaveBeenCalledWith(mockSupabase, mockSettlementRow.id, "Owner", mockUserId, true);
    });

    it("should throw error when max open settlements exceeded", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        insert: insertMock.mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock.mockResolvedValue({
              data: null,
              error: {
                code: "23505",
                message: "settlements_open_limit violated",
              },
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(createSettlement(mockSupabase, command, mockUserId)).rejects.toThrow(
        "Maximum number of open settlements exceeded"
      );
    });

    it("should throw error when addParticipant fails", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        insert: insertMock.mockReturnValue({
          select: selectMock.mockReturnValue({
            single: singleMock.mockResolvedValue({
              data: mockSettlementRow,
              error: null,
            }),
          }),
        }),
      });

      mockAddParticipant.mockRejectedValue(new Error("Failed to add participant"));

      // Act & Assert
      await expect(createSettlement(mockSupabase, command, mockUserId)).rejects.toThrow(
        "Failed to create settlement: could not add owner participant"
      );
    });

    it("should throw error when fetch updated settlement fails", async () => {
      // Arrange
      const command: CreateSettlementCommand = {
        title: "Weekend Trip",
      };

      const insertMock = vi.fn();
      const selectMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          insert: insertMock.mockReturnValue({
            select: selectMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: mockSettlementRow,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Fetch failed" },
              }),
            }),
          }),
        });

      mockAddParticipant.mockResolvedValue({
        id: "participant-1",
        nickname: "Owner",
        is_owner: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        last_edited_by: mockUserId,
      });

      // Act & Assert
      await expect(createSettlement(mockSupabase, command, mockUserId)).rejects.toThrow(
        "Settlement created but failed to fetch updated data: Fetch failed"
      );
    });
  });

  describe("updateSettlementTitle", () => {
    it("should update settlement title", async () => {
      // Arrange
      const newTitle = "Updated Trip Title";
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const updateMock = vi.fn();
      const updateSelectMock = vi.fn();
      const updateSingleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: fetch for validation
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              is: isNullMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { ...mockSettlementRow, status: "open" },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: update
          update: updateMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: updateSelectMock.mockReturnValue({
                single: updateSingleMock.mockResolvedValue({
                  data: { ...mockSettlementRow, title: newTitle },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Third call: fetch expenses for total
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { expenses: [{ amount_cents: 1000 }] },
                error: null,
              }),
            }),
          }),
        });

      // Act
      const result = await updateSettlementTitle(mockSupabase, mockSettlementId, newTitle, mockUserId);

      // Assert
      expect(updateMock).toHaveBeenCalledWith({
        title: newTitle,
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        last_edited_by: mockUserId,
      });
      expect(result.title).toBe(newTitle);
      expect(result.total_expenses_amount_cents).toBe(1000);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(updateSettlementTitle(mockSupabase, mockSettlementId, "New Title", mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user is not owner", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, owner_id: "different-user" },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(updateSettlementTitle(mockSupabase, mockSettlementId, "New Title", mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when settlement is closed", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            is: isNullMock.mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: { ...mockSettlementRow, status: "closed" },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(updateSettlementTitle(mockSupabase, mockSettlementId, "New Title", mockUserId)).rejects.toThrow(
        "Unprocessable Entity: settlement is not open"
      );
    });
  });

  describe("getSettlementSnapshot", () => {
    it("should retrieve settlement snapshot", async () => {
      // Arrange
      const mockSnapshot = {
        settlement_id: mockSettlementId,
        algorithm_version: 1,
        created_at: "2024-01-05T00:00:00Z",
        balances: { "participant-1": 1000, "participant-2": -1000 },
        transfers: [{ from: "participant-2", to: "participant-1", amount_cents: 1000 }],
      };

      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true, status: "closed" },
        error: null,
      });

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const limitMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              limit: limitMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockSnapshot,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await getSettlementSnapshot(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith("check_settlement_participation", {
        p_settlement_id: mockSettlementId,
        p_user_id: mockUserId,
      });
      expect(eqMock).toHaveBeenCalledWith("settlement_id", mockSettlementId);
      expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(limitMock).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockSnapshot);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: false, accessible: false, status: null },
        error: null,
      });

      // Act & Assert
      await expect(getSettlementSnapshot(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user does not have access", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: false, status: null },
        error: null,
      });

      // Act & Assert
      await expect(getSettlementSnapshot(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when settlement is not closed", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true, status: "open" },
        error: null,
      });

      // Act & Assert
      await expect(getSettlementSnapshot(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Unprocessable Entity: settlement is not closed"
      );
    });

    it("should throw error when snapshot not found", async () => {
      // Arrange
      rpcMock.mockResolvedValue({
        data: { exists: true, accessible: true, status: "closed" },
        error: null,
      });

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const limitMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              limit: limitMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getSettlementSnapshot(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Snapshot not found for closed settlement"
      );
    });
  });
});
