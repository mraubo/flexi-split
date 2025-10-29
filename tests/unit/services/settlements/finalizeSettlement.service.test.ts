import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { TransferDTO, UUID, AmountCents } from "@/types";
import {
  calculateSettlementBalances,
  calculateTransfers,
  validateSettlementForClosing,
  finalizeSettlement,
} from "@/lib/services/settlements/finalizeSettlement.service";

// Test data fixtures
const mockSettlementId = "settlement-123";
const mockUserId = "user-456";

const mockBalancesData = [
  { participant_id: "user-1", balance_cents: 1500 }, // Creditor
  { participant_id: "user-2", balance_cents: -1000 }, // Debtor
  { participant_id: "user-3", balance_cents: 500 }, // Creditor
  { participant_id: "user-4", balance_cents: -1000 }, // Debtor
];

const mockBalancesRecord: Record<string, number> = {
  "user-1": 1500,
  "user-2": -1000,
  "user-3": 500,
  "user-4": -1000,
};

const expectedTransfers: TransferDTO[] = [
  { from: "user-2", to: "user-1", amount_cents: 1000 },
  { from: "user-4", to: "user-1", amount_cents: 500 },
  { from: "user-4", to: "user-3", amount_cents: 500 },
];

describe("finalizeSettlement.service", () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock for each test
    mockSupabase = {
      rpc: vi.fn(),
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            count: vi.fn(),
          })),
        })),
      })),
    } as unknown as SupabaseClient<Database>;
  });

  describe("calculateSettlementBalances", () => {
    let rpcMock: any;

    beforeEach(() => {
      rpcMock = mockSupabase.rpc;
    });

    it("should calculate balances successfully", async () => {
      // Arrange
      rpcMock.mockResolvedValue({ data: mockBalancesData, error: null });

      // Act
      const result = await calculateSettlementBalances(mockSupabase, mockSettlementId);

      // Assert
      expect(rpcMock).toHaveBeenCalledWith("calculate_settlement_balances", {
        p_settlement_id: mockSettlementId,
      });
      expect(result).toEqual(mockBalancesRecord);
    });

    it("should handle empty balances array", async () => {
      // Arrange
      rpcMock.mockResolvedValue({ data: [], error: null });

      // Act
      const result = await calculateSettlementBalances(mockSupabase, mockSettlementId);

      // Assert
      expect(result).toEqual({});
    });

    it("should handle null data", async () => {
      // Arrange
      rpcMock.mockResolvedValue({ data: null, error: null });

      // Act
      const result = await calculateSettlementBalances(mockSupabase, mockSettlementId);

      // Assert
      expect(result).toEqual({});
    });

    it("should throw error when RPC fails", async () => {
      // Arrange
      const mockError = new Error("Database connection failed");
      rpcMock.mockResolvedValue({ data: null, error: mockError });

      // Act & Assert
      await expect(calculateSettlementBalances(mockSupabase, mockSettlementId)).rejects.toThrow(
        "Failed to calculate settlement balances: Database connection failed"
      );
    });

    it("should throw error with custom message for specific database errors", async () => {
      // Arrange
      const mockError = new Error("settlement not found");
      rpcMock.mockResolvedValue({ data: null, error: mockError });

      // Act & Assert
      await expect(calculateSettlementBalances(mockSupabase, mockSettlementId)).rejects.toThrow(
        "Failed to calculate settlement balances: settlement not found"
      );
    });
  });

  describe("calculateTransfers", () => {
    it("should calculate transfers for basic creditor-debtor scenario", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "creditor-1": 1000,
        "debtor-1": -1000,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([{ from: "debtor-1", to: "creditor-1", amount_cents: 1000 }]);
    });

    it("should calculate transfers for complex multi-party scenario", () => {
      // Arrange
      const balances = { ...mockBalancesRecord };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual(expectedTransfers);
    });

    it("should return empty transfers when all balances are zero", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 0,
        "user-2": 0,
        "user-3": 0,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty transfers when all balances are positive", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 1000,
        "user-2": 2000,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([]);
    });

    it("should return empty transfers when all balances are negative", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": -1000,
        "user-2": -2000,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle empty balances", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {};

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle single participant with zero balance", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 0,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle exact balance matching", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 500,
        "user-2": -300,
        "user-3": -200,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual([
        { from: "user-2", to: "user-1", amount_cents: 300 },
        { from: "user-3", to: "user-1", amount_cents: 200 },
      ]);
    });

    it("should sort deterministically by balance and ID", () => {
      // Arrange - same balances, different IDs
      const balances: Record<UUID, AmountCents> = {
        "user-z": 1000,
        "user-a": 1000,
        "user-m": -500,
        "user-b": -500,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert - should process largest creditors/debtors first, then by ID
      expect(result).toEqual([
        { from: "user-b", to: "user-a", amount_cents: 500 },
        { from: "user-m", to: "user-a", amount_cents: 500 },
      ]);
    });

    it("should handle large numbers of participants", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {};
      for (let i = 0; i < 100; i++) {
        balances[`user-${i}`] = i % 2 === 0 ? 100 : -100;
      }

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      // Verify total transfer amounts balance out
      const totalTransferred = result.reduce((sum, transfer) => sum + transfer.amount_cents, 0);
      const totalOwed = Object.values(balances)
        .filter((balance) => balance < 0)
        .reduce((sum, balance) => sum + Math.abs(balance), 0);
      expect(totalTransferred).toBe(totalOwed);
    });

    it("should preserve original balances object", () => {
      // Arrange
      const originalBalances = { ...mockBalancesRecord };
      const balances = { ...mockBalancesRecord };

      // Act
      calculateTransfers(balances);

      // Assert
      expect(balances).toEqual(originalBalances);
    });
  });

  describe("validateSettlementForClosing", () => {
    let fromMock: any;
    let selectMock: any;
    let eqMock: any;

    beforeEach(() => {
      fromMock = mockSupabase.from;
      selectMock = vi.fn();
      eqMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock,
        }),
      } as any);
    });

    it("should validate settlement with participants and expenses", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 3, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      // Act
      await expect(validateSettlementForClosing(mockSupabase, mockSettlementId)).resolves.toBeUndefined();

      // Assert
      expect(fromMock).toHaveBeenCalledWith("participants");
      expect(selectMock).toHaveBeenCalledWith("id", { count: "exact", head: true });
      expect(eqMock).toHaveBeenCalledWith("settlement_id", mockSettlementId);
    });

    it("should validate settlement with participants but no expenses", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 2, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      // Act
      await expect(validateSettlementForClosing(mockSupabase, mockSettlementId)).resolves.toBeUndefined();
    });

    it("should throw error when settlement has no participants", async () => {
      // Arrange
      eqMock.mockReturnValueOnce({ count: 0, error: null }); // participants

      // Act & Assert
      await expect(validateSettlementForClosing(mockSupabase, mockSettlementId)).rejects.toThrow(
        "Settlement has no participants"
      );
    });

    it("should throw error when checking participants fails", async () => {
      // Arrange
      const mockError = new Error("Database connection failed");
      eqMock.mockReturnValueOnce({ count: null, error: mockError });

      // Act & Assert
      await expect(validateSettlementForClosing(mockSupabase, mockSettlementId)).rejects.toThrow(
        "Failed to check participants: Database connection failed"
      );
    });

    it("should throw error when checking expenses fails", async () => {
      // Arrange
      const mockError = new Error("Permission denied");
      eqMock
        .mockReturnValueOnce({ count: 2, error: null }) // participants ok
        .mockReturnValueOnce({ error: mockError }); // expenses fail

      // Act & Assert
      await expect(validateSettlementForClosing(mockSupabase, mockSettlementId)).rejects.toThrow(
        "Failed to check expenses: Permission denied"
      );
    });
  });

  describe("finalizeSettlement", () => {
    let rpcMock: any;
    let fromMock: any;
    let selectMock: any;
    let eqMock: any;

    beforeEach(() => {
      rpcMock = mockSupabase.rpc;
      fromMock = mockSupabase.from;
      selectMock = vi.fn();
      eqMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock,
        }),
      } as any);
    });

    it("should finalize settlement successfully", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({ data: true, error: null }); // finalize transaction

      // Act
      const result = await finalizeSettlement(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({
        id: mockSettlementId,
        status: "closed",
        closed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        balances: mockBalancesRecord,
        transfers: expectedTransfers,
      });

      expect(rpcMock).toHaveBeenCalledWith("calculate_settlement_balances", {
        p_settlement_id: mockSettlementId,
      });

      expect(rpcMock).toHaveBeenNthCalledWith(2, "finalize_settlement_transaction", {
        p_settlement_id: mockSettlementId,
        p_balances: mockBalancesRecord,
        p_transfers: expectedTransfers,
        p_user_id: mockUserId,
        p_closed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      });
    });

    it("should finalize settlement with no expenses", async () => {
      // Arrange
      const emptyBalances = {};
      eqMock
        .mockReturnValueOnce({ count: 2, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: [], error: null }) // empty balances
        .mockReturnValueOnce({ data: true, error: null }); // finalize transaction

      // Act
      const result = await finalizeSettlement(mockSupabase, mockSettlementId, mockUserId);

      // Assert
      expect(result).toEqual({
        id: mockSettlementId,
        status: "closed",
        closed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
        balances: emptyBalances,
        transfers: [],
      });
    });

    it("should throw error when validation fails", async () => {
      // Arrange
      eqMock.mockReturnValueOnce({ count: 0, error: null }); // no participants

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Settlement has no participants"
      );
    });

    it("should throw error when balance calculation fails", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 3, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock.mockReturnValueOnce({
        data: null,
        error: new Error("Balance calculation failed"),
      });

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Failed to calculate settlement balances: Balance calculation failed"
      );
    });

    it("should throw error when transaction fails", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({ data: null, error: new Error("Transaction failed") }); // finalize fails

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Failed to finalize settlement: Transaction failed"
      );
    });

    it("should map specific database errors", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({
          data: null,
          error: new Error("settlement not found or not authorized"),
        }); // finalize fails

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Settlement not found or not authorized"
      );
    });

    it("should map already closed error", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({
          data: null,
          error: new Error("already closed"),
        }); // finalize fails

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Settlement is already closed"
      );
    });

    it("should throw error when transaction returns no data", async () => {
      // Arrange
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({ data: null, error: null }); // finalize returns null

      // Act & Assert
      await expect(finalizeSettlement(mockSupabase, mockSettlementId, mockUserId)).rejects.toThrow(
        "Failed to finalize settlement: no result returned"
      );
    });

    it("should use current timestamp for closed_at", async () => {
      // Arrange
      const beforeTime = new Date();
      eqMock
        .mockReturnValueOnce({ count: 4, error: null }) // participants
        .mockReturnValueOnce({ error: null }); // expenses

      rpcMock
        .mockReturnValueOnce({ data: mockBalancesData, error: null }) // calculate balances
        .mockReturnValueOnce({ data: true, error: null }); // finalize transaction

      // Act
      const result = await finalizeSettlement(mockSupabase, mockSettlementId, mockUserId);
      const afterTime = new Date();

      // Assert
      expect(result.closed_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      const resultTime = new Date(result.closed_at);
      expect(resultTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(resultTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  // Type safety tests
  describe("type safety", () => {
    it("should maintain type safety for TransferDTO", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 1000,
        "user-2": -1000,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: expect.any(String),
            to: expect.any(String),
            amount_cents: expect.any(Number),
          }),
        ])
      );

      // Type check - this would fail at compile time if types were wrong
      result.forEach((transfer: TransferDTO) => {
        expect(typeof transfer.from).toBe("string");
        expect(typeof transfer.to).toBe("string");
        expect(typeof transfer.amount_cents).toBe("number");
      });
    });

    it("should maintain type safety for balances record", () => {
      // Arrange
      const balances: Record<UUID, AmountCents> = {
        "user-1": 1000,
        "user-2": -500,
      };

      // Act
      const result = calculateTransfers(balances);

      // Assert - TypeScript would catch if types were incompatible
      expect(result).toBeDefined();
    });
  });
});
