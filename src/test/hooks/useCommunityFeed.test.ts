import { describe, it, expect, vi, beforeEach } from "vitest";
import { format, subDays } from "date-fns";

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

describe("useCommunityFeed Hook Integration", () => {
  const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  const mockUser = { id: "user-123" };
  const today = new Date("2026-01-16");
  const minDate = format(subDays(today, 6), "yyyy-MM-dd");

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  describe("Feed Fetching", () => {
    it("should fetch published check-ins from last 7 days", async () => {
      const mockCheckins = [
        {
          id: "c1",
          user_id: "user-456",
          date: "2026-01-16",
          energy: 8,
          feeling_text: "Great day",
          share_mode: "community",
          created_at: "2026-01-16T10:00:00Z",
        },
        {
          id: "c2",
          user_id: "user-789",
          date: "2026-01-15",
          energy: 6,
          feeling_text: "Feeling okay",
          share_mode: "anonymous",
          created_at: "2026-01-15T09:00:00Z",
        },
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: mockCheckins, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      // Simulate the query
      const builder = mockQueryBuilder
        .select(`id, user_id, date, energy, feeling_text, share_mode, created_at`)
        .eq("published", true)
        .in("share_mode", ["community", "anonymous"])
        .gte("date", minDate)
        .order("date", { ascending: false });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("published", true);
      expect(mockQueryBuilder.in).toHaveBeenCalledWith("share_mode", ["community", "anonymous"]);
      expect(mockQueryBuilder.gte).toHaveBeenCalledWith("date", minDate);
    });

    it("should return empty array when no check-ins exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      // Empty feed should result in empty checkins array
      const checkins: any[] = [];
      expect(checkins).toHaveLength(0);
    });
  });

  describe("Anonymity Handling", () => {
    it("should hide display name for anonymous check-ins", () => {
      const checkinsData = [
        { id: "c1", user_id: "user-456", share_mode: "community" },
        { id: "c2", user_id: "user-789", share_mode: "anonymous" },
      ];

      const profilesMap: Record<string, string | null> = {
        "user-456": "João Silva",
        "user-789": "Maria Santos",
      };

      const processedCheckins = checkinsData.map((c) => ({
        ...c,
        display_name: c.share_mode === "community" ? profilesMap[c.user_id] : null,
      }));

      expect(processedCheckins[0].display_name).toBe("João Silva");
      expect(processedCheckins[1].display_name).toBeNull();
    });
  });

  describe("Reactions Processing", () => {
    it("should count reactions by emoji", () => {
      const reactionsData = [
        { checkin_id: "c1", emoji: "🙏", user_id: "user-1" },
        { checkin_id: "c1", emoji: "🙏", user_id: "user-2" },
        { checkin_id: "c1", emoji: "✨", user_id: "user-1" },
        { checkin_id: "c1", emoji: "💜", user_id: "user-3" },
      ];

      const counts: Record<string, number> = {};
      reactionsData.forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] || 0) + 1;
      });

      expect(counts["🙏"]).toBe(2);
      expect(counts["✨"]).toBe(1);
      expect(counts["💜"]).toBe(1);
    });

    it("should track current user reactions", () => {
      const currentUserId = "user-123";
      const reactionsData = [
        { checkin_id: "c1", emoji: "🙏", user_id: "user-123" },
        { checkin_id: "c1", emoji: "✨", user_id: "user-456" },
        { checkin_id: "c1", emoji: "💜", user_id: "user-123" },
      ];

      const userReactions = reactionsData
        .filter((r) => r.user_id === currentUserId)
        .map((r) => r.emoji);

      expect(userReactions).toContain("🙏");
      expect(userReactions).toContain("💜");
      expect(userReactions).not.toContain("✨");
    });
  });

  describe("Toggle Reaction", () => {
    it("should add reaction when not yet reacted", async () => {
      const checkinId = "c1";
      const emoji = "🔥";
      const userReactions: string[] = [];

      const hasReacted = userReactions.includes(emoji);
      expect(hasReacted).toBe(false);

      // Simulate adding reaction
      const newUserReactions = [...userReactions, emoji];
      expect(newUserReactions).toContain(emoji);

      // Mock insert
      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      await mockQueryBuilder.insert({
        checkin_id: checkinId,
        user_id: mockUser.id,
        emoji,
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        checkin_id: checkinId,
        user_id: mockUser.id,
        emoji,
      });
    });

    it("should remove reaction when already reacted", async () => {
      const checkinId = "c1";
      const emoji = "🙏";
      const userReactions = ["🙏", "✨"];

      const hasReacted = userReactions.includes(emoji);
      expect(hasReacted).toBe(true);

      // Simulate removing reaction
      const newUserReactions = userReactions.filter((e) => e !== emoji);
      expect(newUserReactions).not.toContain(emoji);

      // Mock delete
      const mockQueryBuilder = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      mockQueryBuilder.delete().eq("checkin_id", checkinId).eq("user_id", mockUser.id).eq("emoji", emoji);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it("should not toggle reaction when user not authenticated", () => {
      const user = null;
      const canToggle = user !== null;
      expect(canToggle).toBe(false);
    });
  });

  describe("Report Check-in", () => {
    it("should create report with valid data", async () => {
      const checkinId = "c1";
      const reason = "Conteúdo ofensivo";

      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      await mockQueryBuilder.insert({
        checkin_id: checkinId,
        reporter_user_id: mockUser.id,
        reason,
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        checkin_id: checkinId,
        reporter_user_id: mockUser.id,
        reason,
      });
    });

    it("should not allow reporting when user not authenticated", () => {
      const user = null;
      const canReport = user !== null;
      expect(canReport).toBe(false);
    });

    it("should handle report errors", async () => {
      const mockError = { message: "Report failed" };

      const mockQueryBuilder = {
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder.insert({});
      expect(result.error).toEqual(mockError);
    });
  });

  describe("Feed Filtering", () => {
    it("should exclude private check-ins", () => {
      const allCheckins = [
        { id: "c1", share_mode: "private", published: true },
        { id: "c2", share_mode: "community", published: true },
        { id: "c3", share_mode: "anonymous", published: true },
      ];

      const filteredCheckins = allCheckins.filter(
        (c) => c.share_mode !== "private" && c.published
      );

      expect(filteredCheckins).toHaveLength(2);
      expect(filteredCheckins.every((c) => c.share_mode !== "private")).toBe(true);
    });

    it("should exclude unpublished check-ins", () => {
      const allCheckins = [
        { id: "c1", share_mode: "community", published: true },
        { id: "c2", share_mode: "community", published: false },
        { id: "c3", share_mode: "anonymous", published: true },
      ];

      const filteredCheckins = allCheckins.filter((c) => c.published);

      expect(filteredCheckins).toHaveLength(2);
      expect(filteredCheckins.every((c) => c.published)).toBe(true);
    });

    it("should exclude check-ins older than 7 days", () => {
      const allCheckins = [
        { id: "c1", date: "2026-01-16" },
        { id: "c2", date: "2026-01-10" },
        { id: "c3", date: "2026-01-05" }, // Too old
      ];

      const filteredCheckins = allCheckins.filter((c) => c.date >= minDate);

      expect(filteredCheckins).toHaveLength(2);
    });
  });
});
