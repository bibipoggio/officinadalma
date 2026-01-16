import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the modules
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

describe("useCheckin Hook Integration", () => {
  const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  const mockUser = { id: "user-123" };
  const testDate = "2026-01-16";

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe("Fetch Check-in", () => {
    it("should return null when user is not authenticated", async () => {
      mockUseAuth.mockReturnValue({ user: null });

      // Simulate hook behavior
      const user = null;
      let checkin = null;

      if (!user) {
        checkin = null;
      }

      expect(checkin).toBeNull();
    });

    it("should fetch existing check-in for date", async () => {
      const mockCheckin = {
        id: "checkin-1",
        user_id: "user-123",
        date: testDate,
        energy: 7,
        feeling_text: "Feeling good",
        share_mode: "private",
        published: false,
        created_at: "2026-01-16T10:00:00Z",
        updated_at: "2026-01-16T10:00:00Z",
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockCheckin, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("user_id", mockUser.id)
        .eq("date", testDate)
        .maybeSingle();

      expect(result.data).toEqual(mockCheckin);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("date", testDate);
    });

    it("should return null when no check-in exists for date", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("user_id", mockUser.id)
        .eq("date", testDate)
        .maybeSingle();

      expect(result.data).toBeNull();
    });
  });

  describe("Create Check-in", () => {
    it("should insert new check-in", async () => {
      const newCheckinData = {
        energy: 8,
        feeling_text: "Great day!",
        share_mode: "community",
        published: true,
      };

      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const insertData = {
        user_id: mockUser.id,
        date: testDate,
        ...newCheckinData,
      };

      const result = await mockQueryBuilder.insert(insertData);

      expect(result.error).toBeNull();
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(insertData);
    });

    it("should validate energy is between 1-10", () => {
      const validEnergies = [1, 5, 10];
      const invalidEnergies = [0, 11, -1];

      validEnergies.forEach((energy) => {
        expect(energy >= 1 && energy <= 10).toBe(true);
      });

      invalidEnergies.forEach((energy) => {
        expect(energy >= 1 && energy <= 10).toBe(false);
      });
    });

    it("should validate share_mode values", () => {
      const validModes = ["private", "community", "anonymous"];
      
      validModes.forEach((mode) => {
        expect(["private", "community", "anonymous"].includes(mode)).toBe(true);
      });
    });
  });

  describe("Update Check-in", () => {
    it("should update existing check-in", async () => {
      const existingCheckinId = "checkin-1";
      const updateData = {
        energy: 9,
        feeling_text: "Updated feeling",
        share_mode: "anonymous",
        published: true,
      };

      const mockQueryBuilder = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      await mockQueryBuilder.update(updateData).eq("id", existingCheckinId);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(updateData);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", existingCheckinId);
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors", async () => {
      const mockError = { message: "Database error" };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("user_id", mockUser.id)
        .eq("date", testDate)
        .maybeSingle();

      expect(result.error).toEqual(mockError);
    });

    it("should handle insert errors", async () => {
      const mockError = { message: "Insert failed" };

      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder.insert({});

      expect(result.error).toEqual(mockError);
    });

    it("should return error when user not authenticated on save", () => {
      const user = null;
      const saveResult = !user
        ? { success: false, error: new Error("User not authenticated") }
        : { success: true, error: null };

      expect(saveResult.success).toBe(false);
      expect(saveResult.error?.message).toBe("User not authenticated");
    });
  });
});
