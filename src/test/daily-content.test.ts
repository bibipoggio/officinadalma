import { describe, it, expect } from "vitest";

// Test daily content logic
describe("Daily Content Logic", () => {
  describe("Content Visibility", () => {
    it("should show content when published", () => {
      const content = { published: true, tonica_title: "Título" };
      expect(content.published).toBe(true);
    });

    it("should hide content when not published", () => {
      const content = { published: false, tonica_title: "Título" };
      expect(content.published).toBe(false);
    });
  });

  describe("Required Fields Validation", () => {
    const validateContent = (content: {
      tonica_title?: string;
      tonica_short?: string;
      tonica_full?: string;
      tonica_practice?: string;
    }): string[] => {
      const missingFields: string[] = [];
      if (!content.tonica_title) missingFields.push("Título da Tônica");
      if (!content.tonica_short) missingFields.push("Resumo");
      if (!content.tonica_full) missingFields.push("Texto Completo");
      if (!content.tonica_practice) missingFields.push("Prática");
      return missingFields;
    };

    it("should return no missing fields for complete content", () => {
      const content = {
        tonica_title: "Título",
        tonica_short: "Resumo",
        tonica_full: "Texto completo",
        tonica_practice: "Prática",
      };
      expect(validateContent(content)).toEqual([]);
    });

    it("should return missing fields for incomplete content", () => {
      const content = {
        tonica_title: "Título",
        tonica_short: "",
        tonica_full: "Texto completo",
        tonica_practice: "",
      };
      const missing = validateContent(content);
      expect(missing).toContain("Resumo");
      expect(missing).toContain("Prática");
    });

    it("should return all fields missing for empty content", () => {
      const content = {};
      const missing = validateContent(content);
      expect(missing).toHaveLength(4);
    });
  });

  describe("Date Handling", () => {
    it("should format date as DD/MM/AAAA for display", () => {
      const formatDateBR = (dateStr: string): string => {
        const date = new Date(dateStr + "T00:00:00");
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      expect(formatDateBR("2026-01-16")).toBe("16/01/2026");
      expect(formatDateBR("2026-12-25")).toBe("25/12/2026");
    });

    it("should get today's date in YYYY-MM-DD format", () => {
      const today = new Date();
      const formatted = today.toISOString().split("T")[0];
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("Meditation (Premium Content)", () => {
    it("should hide meditation URL for non-premium users", () => {
      const content = {
        meditation_audio_url: "https://example.com/audio.mp3",
        meditation_duration_seconds: 600,
      };
      const isPremium = false;

      const visibleContent = isPremium
        ? content
        : { ...content, meditation_audio_url: null };

      expect(visibleContent.meditation_audio_url).toBeNull();
    });

    it("should show meditation URL for premium users", () => {
      const content = {
        meditation_audio_url: "https://example.com/audio.mp3",
        meditation_duration_seconds: 600,
      };
      const isPremium = true;

      const visibleContent = isPremium
        ? content
        : { ...content, meditation_audio_url: null };

      expect(visibleContent.meditation_audio_url).toBe(
        "https://example.com/audio.mp3"
      );
    });

    it("should format meditation duration", () => {
      const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, "0")}`;
      };

      expect(formatDuration(600)).toBe("10:00");
      expect(formatDuration(125)).toBe("2:05");
      expect(formatDuration(3661)).toBe("61:01");
    });
  });

  describe("Spotify Content", () => {
    it("should validate Spotify URL format", () => {
      const isValidSpotifyUrl = (url: string): boolean => {
        return (
          url.includes("open.spotify.com/episode/") ||
          url.includes("open.spotify.com/show/")
        );
      };

      expect(
        isValidSpotifyUrl(
          "https://open.spotify.com/episode/1234567890abcdef"
        )
      ).toBe(true);
      expect(
        isValidSpotifyUrl("https://open.spotify.com/show/1234567890abcdef")
      ).toBe(true);
      expect(isValidSpotifyUrl("https://youtube.com/watch?v=123")).toBe(false);
    });
  });
});

describe("Monthly Streak Logic", () => {
  describe("Streak Calculation", () => {
    it("should count unique days with check-ins", () => {
      const checkins = [
        { date: "2026-01-01" },
        { date: "2026-01-02" },
        { date: "2026-01-02" }, // Duplicate should not count
        { date: "2026-01-05" },
      ];

      const uniqueDays = new Set(checkins.map((c) => c.date)).size;
      expect(uniqueDays).toBe(3);
    });

    it("should only count check-ins from current month", () => {
      const currentMonth = "2026-01";
      const checkins = [
        { date: "2026-01-01" },
        { date: "2026-01-15" },
        { date: "2025-12-31" }, // Previous month
        { date: "2026-02-01" }, // Next month
      ];

      const currentMonthCheckins = checkins.filter((c) =>
        c.date.startsWith(currentMonth)
      );
      expect(currentMonthCheckins).toHaveLength(2);
    });
  });

  describe("Incentive Messages", () => {
    const getStreakMessage = (days: number): string => {
      return days === 0
        ? "Comece sua jornada hoje!"
        : `${days} dias com check-in neste mês`;
    };

    it("should show incentive message when streak is 0", () => {
      expect(getStreakMessage(0)).toBe("Comece sua jornada hoje!");
    });

    it("should show streak count when > 0", () => {
      expect(getStreakMessage(5)).toBe("5 dias com check-in neste mês");
    });
  });
});
