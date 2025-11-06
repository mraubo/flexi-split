import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import type { GetParticipantsQuery } from "@/types";
import {
  addParticipant,
  updateNickname,
  removeParticipant,
  getById,
  listParticipants,
} from "@/lib/services/participants.service";

// Mock settlements service
vi.mock("@/lib/services/settlements.service", () => ({
  checkAccessOrExistence: vi.fn(),
}));

import { checkAccessOrExistence } from "@/lib/services/settlements.service";

// Test data fixtures
const mockUserId = "user-123";
const mockSettlementId = "settlement-456";
const mockParticipantId = "participant-789";

const mockParticipantRow = {
  id: mockParticipantId,
  nickname: "john",
  is_owner: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  last_edited_by: mockUserId,
};

const mockSettlementRow = {
  owner_id: mockUserId,
  status: "open" as const,
  participants_count: 3,
};

describe("participants.service", () => {
  let mockSupabase: SupabaseClient<Database>;
  let fromMock: any;
  const mockCheckAccess = checkAccessOrExistence as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    fromMock = vi.fn();
    mockSupabase = {
      from: fromMock,
    } as unknown as SupabaseClient<Database>;
  });

  describe("addParticipant", () => {
    it("should add a participant successfully", async () => {
      // Arrange
      const nickname = "alice";
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();
      const insertMock = vi.fn();
      const insertSelectMock = vi.fn();
      const insertSingleMock = vi.fn();
      const updateMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call: fetch settlement
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                is: isNullMock.mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: mockSettlementRow,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Second call: check nickname uniqueness (owner check is skipped when isOwner=false)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock.mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Third call: insert participant
          return {
            insert: insertMock.mockReturnValue({
              select: insertSelectMock.mockReturnValue({
                single: insertSingleMock.mockResolvedValue({
                  data: { ...mockParticipantRow, nickname },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Fourth call: update settlement count
          return {
            update: updateMock.mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
      });

      // Act
      const result = await addParticipant(mockSupabase, mockSettlementId, nickname, mockUserId);

      // Assert
      expect(insertMock).toHaveBeenCalledWith({
        settlement_id: mockSettlementId,
        nickname,
        is_owner: false,
        last_edited_by: mockUserId,
      });
      expect(updateMock).toHaveBeenCalledWith({
        participants_count: 4, // 3 + 1
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        last_edited_by: mockUserId,
      });
      expect(result.nickname).toBe(nickname);
    });

    it("should add owner participant when isOwner=true", async () => {
      // Arrange
      const nickname = "owner";
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();
      const insertMock = vi.fn();
      const insertSelectMock = vi.fn();
      const insertSingleMock = vi.fn();
      const updateMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              is: isNullMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: { ...mockSettlementRow, participants_count: 0 },
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Check for existing owner
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: maybeSingleMock.mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: insertMock.mockReturnValue({
            select: insertSelectMock.mockReturnValue({
              single: insertSingleMock.mockResolvedValue({
                data: { ...mockParticipantRow, nickname, is_owner: true },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: updateMock.mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

      // Act
      const result = await addParticipant(mockSupabase, mockSettlementId, nickname, mockUserId, true);

      // Assert
      expect(insertMock).toHaveBeenCalledWith({
        settlement_id: mockSettlementId,
        nickname,
        is_owner: true,
        last_edited_by: mockUserId,
      });
      expect(result.is_owner).toBe(true);
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
                error: new Error("Not found"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(addParticipant(mockSupabase, mockSettlementId, "alice", mockUserId)).rejects.toThrow(
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
      await expect(addParticipant(mockSupabase, mockSettlementId, "alice", mockUserId)).rejects.toThrow(
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
      await expect(addParticipant(mockSupabase, mockSettlementId, "alice", mockUserId)).rejects.toThrow(
        "Settlement is closed: cannot add participants to closed settlements"
      );
    });

    it("should throw error when max participant limit reached", async () => {
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
                data: { ...mockSettlementRow, participants_count: 10 },
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(addParticipant(mockSupabase, mockSettlementId, "alice", mockUserId)).rejects.toThrow(
        "Maximum participant limit reached: cannot add more than 10 participants"
      );
    });

    it("should throw error when owner already exists", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              is: isNullMock.mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockSettlementRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "existing-owner" },
                  error: null,
                }),
              }),
            }),
          }),
        });

      // Act & Assert
      await expect(addParticipant(mockSupabase, mockSettlementId, "owner", mockUserId, true)).rejects.toThrow(
        "Owner already exists for this settlement"
      );
    });

    it("should throw error when nickname already exists (case-insensitive)", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                is: isNullMock.mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: mockSettlementRow,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else {
          // Second call: check nickname uniqueness (returns existing)
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock.mockResolvedValue({
                    data: { id: "existing-participant" },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
      });

      // Act & Assert
      await expect(addParticipant(mockSupabase, mockSettlementId, "Alice", mockUserId)).rejects.toThrow(
        "Nickname already exists in this settlement"
      );
    });

    it("should throw error when settlement update fails", async () => {
      // Arrange
      const nickname = "alice";
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const isNullMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();
      const insertMock = vi.fn();
      const insertSelectMock = vi.fn();
      const insertSingleMock = vi.fn();
      const updateMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                is: isNullMock.mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: mockSettlementRow,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          // Check nickname uniqueness
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock.mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Insert participant
          return {
            insert: insertMock.mockReturnValue({
              select: insertSelectMock.mockReturnValue({
                single: insertSingleMock.mockResolvedValue({
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Update settlement count - fails
          return {
            update: updateMock.mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: new Error("Update failed"),
              }),
            }),
          };
        }
      });

      // Act & Assert
      await expect(addParticipant(mockSupabase, mockSettlementId, nickname, mockUserId)).rejects.toThrow(
        "Failed to update settlement count: Update failed"
      );
    });
  });

  describe("updateNickname", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should update participant nickname", async () => {
      // Arrange
      const newNickname = "bobby";
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();
      const updateMock = vi.fn();
      const updateEqMock = vi.fn();
      const updateSelectMock = vi.fn();
      const updateSingleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: check participant exists
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: check settlement status
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "open" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Third call: check nickname uniqueness
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock.mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Fourth call: update participant
          update: updateMock.mockReturnValue({
            eq: updateEqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: updateSelectMock.mockReturnValue({
                  single: updateSingleMock.mockResolvedValue({
                    data: { ...mockParticipantRow, nickname: newNickname },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        });

      // Act
      const result = await updateNickname(mockSupabase, mockSettlementId, mockParticipantId, newNickname, mockUserId);

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(updateMock).toHaveBeenCalledWith({
        nickname: newNickname,
        last_edited_by: mockUserId,
        updated_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      });
      expect(result.nickname).toBe(newNickname);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });

      // Act & Assert
      await expect(
        updateNickname(mockSupabase, mockSettlementId, mockParticipantId, "newname", mockUserId)
      ).rejects.toThrow("Settlement not found");
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });

      // Act & Assert
      await expect(
        updateNickname(mockSupabase, mockSettlementId, mockParticipantId, "newname", mockUserId)
      ).rejects.toThrow("Forbidden: insufficient permissions");
    });

    it("should throw error when participant not found", async () => {
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
                error: new Error("Not found"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(
        updateNickname(mockSupabase, mockSettlementId, mockParticipantId, "newname", mockUserId)
      ).rejects.toThrow("Participant not found");
    });

    it("should throw error when settlement is closed", async () => {
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
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "closed" },
                error: null,
              }),
            }),
          }),
        });

      // Act & Assert
      await expect(
        updateNickname(mockSupabase, mockSettlementId, mockParticipantId, "newname", mockUserId)
      ).rejects.toThrow("Settlement is closed: cannot update participants in closed settlements");
    });

    it("should throw error when nickname already exists", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const maybeSingleMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "open" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                neq: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleMock.mockResolvedValue({
                    data: { id: "another-participant" },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        });

      // Act & Assert
      await expect(
        updateNickname(mockSupabase, mockSettlementId, mockParticipantId, "existing", mockUserId)
      ).rejects.toThrow("Nickname already exists in this settlement");
    });
  });

  describe("removeParticipant", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should remove participant successfully", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();
      const deleteMock = vi.fn();

      fromMock
        .mockReturnValueOnce({
          // First call: check participant exists
          select: selectMock.mockReturnValue({
            eq: eqMock.mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleMock.mockResolvedValue({
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Second call: check settlement status
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "open" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Third call: check expenses as payer
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                count: 0,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          // Fourth call: check expense_participants
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              count: 0,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          // Fifth call: delete participant
          delete: deleteMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          }),
        });

      // Act
      await removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId);

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(deleteMock).toHaveBeenCalled();
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when participant not found", async () => {
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
                error: new Error("Not found"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Participant not found"
      );
    });

    it("should throw error when settlement is closed", async () => {
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
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "closed" },
                error: null,
              }),
            }),
          }),
        });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Settlement is closed: cannot remove participants from closed settlements"
      );
    });

    it("should throw error when participant has expenses as payer", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      let callCount = 0;
      fromMock.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            select: selectMock.mockReturnValue({
              eq: eqMock.mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: singleMock.mockResolvedValue({
                    data: mockParticipantRow,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 2) {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: "open" },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  count: 2,
                  error: null,
                }),
              }),
            }),
          };
        }
      });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Cannot remove participant: participant has associated expenses"
      );
    });

    it("should throw error when participant is in expense_participants", async () => {
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
                  data: mockParticipantRow,
                  error: null,
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { status: "open" },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                count: 0,
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              count: 3,
              error: null,
            }),
          }),
        });

      // Act & Assert
      await expect(removeParticipant(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Cannot remove participant: participant has associated expenses"
      );
    });
  });

  describe("getById", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should retrieve participant by ID", async () => {
      // Arrange
      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const singleMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock.mockResolvedValue({
                data: mockParticipantRow,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await getById(mockSupabase, mockSettlementId, mockParticipantId, mockUserId);

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(result).toEqual(mockParticipantRow);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });

      // Act & Assert
      await expect(getById(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });

      // Act & Assert
      await expect(getById(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should throw error when participant not found", async () => {
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
                error: new Error("Not found"),
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(getById(mockSupabase, mockSettlementId, mockParticipantId, mockUserId)).rejects.toThrow(
        "Participant not found"
      );
    });
  });

  describe("listParticipants", () => {
    beforeEach(() => {
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: true });
    });

    it("should list participants with default pagination", async () => {
      // Arrange
      const query: GetParticipantsQuery = {};
      const participants = [mockParticipantRow, { ...mockParticipantRow, id: "participant-2", nickname: "alice" }];

      const selectMock = vi.fn();
      const eqMock = vi.fn();
      const orderMock = vi.fn();
      const rangeMock = vi.fn();

      fromMock.mockReturnValue({
        select: selectMock.mockReturnValue({
          eq: eqMock.mockReturnValue({
            order: orderMock.mockReturnValue({
              range: rangeMock.mockResolvedValue({
                data: participants,
                count: 2,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listParticipants(mockSupabase, mockSettlementId, query, mockUserId);

      // Assert
      expect(mockCheckAccess).toHaveBeenCalledWith(mockSupabase, mockSettlementId, mockUserId);
      expect(eqMock).toHaveBeenCalledWith("settlement_id", mockSettlementId);
      expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: true });
      expect(rangeMock).toHaveBeenCalledWith(0, 49); // Default limit 50
      expect(result.data).toEqual(participants);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        total_pages: 1,
      });
    });

    it("should list participants with custom pagination", async () => {
      // Arrange
      const query: GetParticipantsQuery = { page: 2, limit: 10 };
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
                count: 5,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await listParticipants(mockSupabase, mockSettlementId, query, mockUserId);

      // Assert
      expect(rangeMock).toHaveBeenCalledWith(10, 19); // Page 2, offset 10
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
    });

    it("should enforce maximum limit of 100", async () => {
      // Arrange
      const query: GetParticipantsQuery = { limit: 200 };
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
      const result = await listParticipants(mockSupabase, mockSettlementId, query, mockUserId);

      // Assert
      expect(rangeMock).toHaveBeenCalledWith(0, 99); // Capped at 100
      expect(result.pagination.limit).toBe(100);
    });

    it("should throw error when settlement not found", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: false, accessible: false });

      // Act & Assert
      await expect(listParticipants(mockSupabase, mockSettlementId, {}, mockUserId)).rejects.toThrow(
        "Settlement not found"
      );
    });

    it("should throw error when user lacks access", async () => {
      // Arrange
      mockCheckAccess.mockResolvedValue({ exists: true, accessible: false });

      // Act & Assert
      await expect(listParticipants(mockSupabase, mockSettlementId, {}, mockUserId)).rejects.toThrow(
        "Forbidden: insufficient permissions"
      );
    });

    it("should handle empty results", async () => {
      // Arrange
      const query: GetParticipantsQuery = {};
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
      const result = await listParticipants(mockSupabase, mockSettlementId, query, mockUserId);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should throw error on database failure", async () => {
      // Arrange
      const query: GetParticipantsQuery = {};
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
      await expect(listParticipants(mockSupabase, mockSettlementId, query, mockUserId)).rejects.toThrow(
        "Failed to fetch participants: Database error"
      );
    });
  });
});
