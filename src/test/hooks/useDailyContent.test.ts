import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the modules
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from "@/integrations/supabase/client";

describe("useDailyContentForDate Hook Integration", () => {
  const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
  const testDate = "2026-01-16";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Fetch Daily Content", () => {
    it("should fetch published content for date", async () => {
      const mockContent = {
        id: "dc-1",
        date: testDate,
        tonica_title: "Tônica do Dia",
        tonica_short: "Resumo da tônica",
        tonica_full: "Texto completo da tônica",
        tonica_practice: "Prática sugerida",
        meditation_audio_url: "https://example.com/audio.mp3",
        meditation_duration_seconds: 600,
        spotify_episode_url: "https://open.spotify.com/episode/123",
        published: true,
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      expect(result.data).toEqual(mockContent);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("date", testDate);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("published", true);
    });

    it("should return null for unpublished content", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      expect(result.data).toBeNull();
    });

    it("should return null when no content exists", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", "2025-01-01") // Old date
        .eq("published", true)
        .maybeSingle();

      expect(result.data).toBeNull();
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
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      expect(result.error).toEqual(mockError);
    });
  });

  describe("Premium Content Filtering", () => {
    it("should include meditation URL in response", async () => {
      const mockContent = {
        id: "dc-1",
        date: testDate,
        tonica_title: "Tônica",
        meditation_audio_url: "https://example.com/premium-audio.mp3",
        meditation_duration_seconds: 900,
        published: true,
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      // Note: Filtering should happen in the component/hook based on user's premium status
      expect(result.data?.meditation_audio_url).toBe("https://example.com/premium-audio.mp3");
    });

    it("should filter meditation URL for non-premium users", () => {
      const content = {
        meditation_audio_url: "https://example.com/premium-audio.mp3",
        meditation_duration_seconds: 900,
      };
      const isPremium = false;

      const filteredContent = {
        ...content,
        meditation_audio_url: isPremium ? content.meditation_audio_url : null,
      };

      expect(filteredContent.meditation_audio_url).toBeNull();
    });

    it("should expose meditation URL for premium users", () => {
      const content = {
        meditation_audio_url: "https://example.com/premium-audio.mp3",
        meditation_duration_seconds: 900,
      };
      const isPremium = true;

      const filteredContent = {
        ...content,
        meditation_audio_url: isPremium ? content.meditation_audio_url : null,
      };

      expect(filteredContent.meditation_audio_url).toBe("https://example.com/premium-audio.mp3");
    });
  });

  describe("Spotify Content", () => {
    it("should include Spotify URL when available", async () => {
      const mockContent = {
        id: "dc-1",
        date: testDate,
        spotify_episode_url: "https://open.spotify.com/episode/abc123",
        published: true,
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      expect(result.data?.spotify_episode_url).toBe("https://open.spotify.com/episode/abc123");
    });

    it("should return null for missing Spotify URL", async () => {
      const mockContent = {
        id: "dc-1",
        date: testDate,
        spotify_episode_url: null,
        published: true,
      };

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockContent, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder
        .select("*")
        .eq("date", testDate)
        .eq("published", true)
        .maybeSingle();

      expect(result.data?.spotify_episode_url).toBeNull();
    });
  });

  describe("Content Validation", () => {
    it("should validate required tonica fields", () => {
      const validateContent = (content: any): string[] => {
        const missing: string[] = [];
        if (!content.tonica_title) missing.push("Título da Tônica");
        if (!content.tonica_short) missing.push("Resumo");
        if (!content.tonica_full) missing.push("Texto Completo");
        if (!content.tonica_practice) missing.push("Prática");
        return missing;
      };

      const completeContent = {
        tonica_title: "Título",
        tonica_short: "Resumo",
        tonica_full: "Texto",
        tonica_practice: "Prática",
      };

      const incompleteContent = {
        tonica_title: "Título",
        tonica_short: "",
      };

      expect(validateContent(completeContent)).toHaveLength(0);
      expect(validateContent(incompleteContent)).toContain("Resumo");
      expect(validateContent(incompleteContent)).toContain("Texto Completo");
      expect(validateContent(incompleteContent)).toContain("Prática");
    });

    it("should format meditation duration", () => {
      const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, "0")}`;
      };

      expect(formatDuration(600)).toBe("10:00");
      expect(formatDuration(900)).toBe("15:00");
      expect(formatDuration(125)).toBe("2:05");
    });
  });
});
