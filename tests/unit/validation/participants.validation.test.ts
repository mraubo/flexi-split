import { describe, it, expect } from "vitest";
import { CreateParticipantCommandSchema, UpdateParticipantCommandSchema } from "@/lib/validation/participants";

describe("CreateParticipantCommandSchema", () => {
  describe("valid nicknames", () => {
    it("should accept lowercase letters", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("john");
      }
    });

    it("should accept uppercase letters", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "John" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("John");
      }
    });

    it("should accept mixed case", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "JohnDoe" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("JohnDoe");
      }
    });

    it("should accept polish characters", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "Łukasz" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("Łukasz");
      }
    });

    it("should accept spaces and trim them", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: " John Doe " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("John Doe");
      }
    });

    it("should accept email-like characters", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john.doe+test@example" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("john.doe+test@example");
      }
    });

    it("should accept underscores and hyphens", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john_doe-123" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("john_doe-123");
      }
    });

    it("should accept numbers", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "user123" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("user123");
      }
    });

    it("should accept special characters allowed in emails", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "test!#$%&'*" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("test!#$%&'*");
      }
    });
  });

  describe("invalid nicknames", () => {
    it("should reject empty string", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "" });
      expect(result.success).toBe(false);
    });

    it("should reject single character", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "a" });
      expect(result.success).toBe(false);
    });

    it("should reject nickname longer than 30 characters", () => {
      const result = CreateParticipantCommandSchema.safeParse({
        nickname: "a".repeat(31),
      });
      expect(result.success).toBe(false);
    });

    it("should reject nickname with only spaces", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "   " });
      expect(result.success).toBe(false);
    });

    it("should reject nickname that becomes too short after trimming", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: " a " });
      expect(result.success).toBe(false);
    });

    it("should reject nickname with disallowed special characters", () => {
      // Testing characters not in the allowed set
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john<>doe" });
      expect(result.success).toBe(false);
    });

    it("should reject nickname with emoji", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john😊" });
      expect(result.success).toBe(false);
    });

    it("should reject nickname with newline", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john\ndoe" });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept exactly 2 characters", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "ab" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("ab");
      }
    });

    it("should accept exactly 30 characters", () => {
      const result = CreateParticipantCommandSchema.safeParse({
        nickname: "a".repeat(30),
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("a".repeat(30));
      }
    });

    it("should trim leading and trailing spaces", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "  john  " });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("john");
      }
    });

    it("should preserve spaces in the middle", () => {
      const result = CreateParticipantCommandSchema.safeParse({ nickname: "john  doe" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe("john  doe");
      }
    });
  });
});

describe("UpdateParticipantCommandSchema", () => {
  it("should have the same validation rules as CreateParticipantCommandSchema", () => {
    const createResult = CreateParticipantCommandSchema.safeParse({ nickname: "John Doe" });
    const updateResult = UpdateParticipantCommandSchema.safeParse({ nickname: "John Doe" });

    expect(createResult.success).toBe(updateResult.success);
    if (createResult.success && updateResult.success) {
      expect(createResult.data.nickname).toBe(updateResult.data.nickname);
    }
  });

  it("should trim spaces like CreateParticipantCommandSchema", () => {
    const result = UpdateParticipantCommandSchema.safeParse({ nickname: "  test  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nickname).toBe("test");
    }
  });
});
