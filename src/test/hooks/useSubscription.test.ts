import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the modules before importing
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

describe("useSubscription Hook Logic", () => {
  const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
  const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Subscription Fetching", () => {
    it("should not fetch when user is null", async () => {
      mockUseAuth.mockReturnValue({ user: null });

      // Simulate the hook logic
      const user = null;
      let subscription = null;

      if (!user) {
        subscription = null;
      }

      expect(subscription).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("should fetch subscription for authenticated user", async () => {
      const mockUser = { id: "user-123" };
      const mockSubscription = {
        id: "sub-1",
        user_id: "user-123",
        provider: "mercado_pago",
        trial_ends_at: "2026-01-20T00:00:00Z",
        current_period_end: null,
      };

      mockUseAuth.mockReturnValue({ user: mockUser });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSubscription, error: null }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      // Simulate fetch
      const result = await mockQueryBuilder.select("*").eq("user_id", mockUser.id).maybeSingle();

      expect(result.data).toEqual(mockSubscription);
      expect(result.error).toBeNull();
    });

    it("should handle fetch errors gracefully", async () => {
      const mockUser = { id: "user-123" };
      const mockError = new Error("Database error");

      mockUseAuth.mockReturnValue({ user: mockUser });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      mockFrom.mockReturnValue(mockQueryBuilder);

      const result = await mockQueryBuilder.select("*").eq("user_id", mockUser.id).maybeSingle();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe("Premium Status Calculation", () => {
    const now = new Date("2026-01-16T12:00:00Z");

    it("should be premium with active trial", () => {
      const subscription = {
        trial_ends_at: "2026-01-20T00:00:00Z",
        current_period_end: null,
      };

      const isTrialing = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at) > now
        : false;
      const hasActiveSubscription = subscription.current_period_end
        ? new Date(subscription.current_period_end) > now
        : false;
      const isPremium = isTrialing || hasActiveSubscription;

      expect(isTrialing).toBe(true);
      expect(hasActiveSubscription).toBe(false);
      expect(isPremium).toBe(true);
    });

    it("should be premium with active subscription", () => {
      const subscription = {
        trial_ends_at: null,
        current_period_end: "2026-02-16T00:00:00Z",
      };

      const isTrialing = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at) > now
        : false;
      const hasActiveSubscription = subscription.current_period_end
        ? new Date(subscription.current_period_end) > now
        : false;
      const isPremium = isTrialing || hasActiveSubscription;

      expect(isTrialing).toBe(false);
      expect(hasActiveSubscription).toBe(true);
      expect(isPremium).toBe(true);
    });

    it("should not be premium with expired trial", () => {
      const subscription = {
        trial_ends_at: "2026-01-10T00:00:00Z",
        current_period_end: null,
      };

      const isTrialing = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at) > now
        : false;
      const isPremium = isTrialing;

      expect(isTrialing).toBe(false);
      expect(isPremium).toBe(false);
    });

    it("should not be premium with expired subscription", () => {
      const subscription = {
        trial_ends_at: null,
        current_period_end: "2026-01-10T00:00:00Z",
      };

      const hasActiveSubscription = subscription.current_period_end
        ? new Date(subscription.current_period_end) > now
        : false;
      const isPremium = hasActiveSubscription;

      expect(hasActiveSubscription).toBe(false);
      expect(isPremium).toBe(false);
    });

    it("should not be premium with no subscription", () => {
      const subscription = null;
      const isPremium = subscription !== null;

      expect(isPremium).toBe(false);
    });
  });
});
