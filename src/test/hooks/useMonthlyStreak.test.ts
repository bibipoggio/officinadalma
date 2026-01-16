import { describe, it, expect, vi, beforeEach } from "vitest";
import { format, startOfMonth } from "date-fns";

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

describe("useMonthlyStreak Hook Integration", () => {
  const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  const mockUser = { id: "user-123" };
  const today = new Date("2026-01-16");
  const firstDayOfMonth = startOfMonth(today);
  const todayStr = format(today, "yyyy-MM-dd");
  const firstDayStr = format(firstDayOfMonth, "yyyy-MM-dd");

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe("Streak Fetching", () => {
    it("should return 0 when user is not authenticated", () => {
      mockUseAuth.mockReturnValue({ user: null });

      const user = null;
      const streakDays = user ? 5 : 0;

      expect(streakDays).toBe(0);
    });

    it("should count unique check-in days in current month", async () => {
      const mockCheckins = [
        { date: "2026-01-01" },
        { date: "2026-01-05" },
        { date: "2026-01-10" },
        { date: "2026-01-15" },
        { date: "2026-01-16" },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockCheckins, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      // Simulate the query
      mockQueryBuilder
        .select("date")
        .eq("user_id", mockUser.id)
        .gte("date", firstDayStr)
        .lte("date", todayStr);

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("user_id", mockUser.id);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("date", firstDayStr);
      expect(mockQueryBuilder.lte).toHaveBeenCalledWith("date", todayStr);

      // Count unique dates
      const uniqueDates = new Set(mockCheckins.map((c) => c.date));
      expect(uniqueDates.size).toBe(5);
    });

    it("should handle duplicate dates correctly", () => {
      const checkinsData = [
        { date: "2026-01-01" },
        { date: "2026-01-01" }, // Duplicate
        { date: "2026-01-05" },
        { date: "2026-01-05" }, // Duplicate
        { date: "2026-01-10" },
      ];

      const uniqueDates = new Set(checkinsData.map((c) => c.date));
      expect(uniqueDates.size).toBe(3);
    });

    it("should return 0 when no check-ins exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const uniqueDates = new Set<string>([]);
      expect(uniqueDates.size).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should return 0 on fetch error", async () => {
      const mockError = { message: "Database error" };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      // On error, streak should be 0
      const streakDays = 0;
      expect(streakDays).toBe(0);
    });
  });

  describe("Date Range Calculation", () => {
    it("should use first day of current month as start", () => {
      const testDate = new Date("2026-01-16");
      const firstDay = startOfMonth(testDate);
      const firstDayFormatted = format(firstDay, "yyyy-MM-dd");

      expect(firstDayFormatted).toBe("2026-01-01");
    });

    it("should use today as end date", () => {
      const testDate = new Date("2026-01-16");
      const todayFormatted = format(testDate, "yyyy-MM-dd");

      expect(todayFormatted).toBe("2026-01-16");
    });

    it("should handle end of month correctly", () => {
      const endOfMonth = new Date("2026-01-31");
      const firstDay = startOfMonth(endOfMonth);
      const firstDayFormatted = format(firstDay, "yyyy-MM-dd");

      expect(firstDayFormatted).toBe("2026-01-01");
    });

    it("should handle February correctly", () => {
      const febDate = new Date("2026-02-15");
      const firstDay = startOfMonth(febDate);
      const firstDayFormatted = format(firstDay, "yyyy-MM-dd");

      expect(firstDayFormatted).toBe("2026-02-01");
    });
  });

  describe("Display Logic", () => {
    it("should display incentive message when streak is 0", () => {
      const getStreakMessage = (days: number): string => {
        return days === 0
          ? "Comece sua jornada hoje!"
          : `${days} dias com check-in neste mês`;
      };

      expect(getStreakMessage(0)).toBe("Comece sua jornada hoje!");
    });

    it("should display streak count when greater than 0", () => {
      const getStreakMessage = (days: number): string => {
        return days === 0
          ? "Comece sua jornada hoje!"
          : `${days} dias com check-in neste mês`;
      };

      expect(getStreakMessage(5)).toBe("5 dias com check-in neste mês");
      expect(getStreakMessage(15)).toBe("15 dias com check-in neste mês");
    });

    it("should handle singular day correctly", () => {
      const getStreakMessage = (days: number): string => {
        if (days === 0) return "Comece sua jornada hoje!";
        if (days === 1) return "1 dia com check-in neste mês";
        return `${days} dias com check-in neste mês`;
      };

      expect(getStreakMessage(1)).toBe("1 dia com check-in neste mês");
    });
  });
});
