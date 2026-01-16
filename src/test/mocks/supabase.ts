import { vi } from "vitest";

// Mock Supabase query builder
export const createMockQueryBuilder = () => {
  const builder: any = {
    _data: null,
    _error: null,
    _single: false,

    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(function (this: any) {
      this._single = true;
      return this;
    }),
    maybeSingle: vi.fn(function (this: any) {
      this._single = true;
      return Promise.resolve({ data: this._data, error: this._error });
    }),

    // Allow setting mock data
    mockResolveValue: function (data: any, error: any = null) {
      this._data = data;
      this._error = error;
      return this;
    },

    // Promise resolution
    then: function (resolve: any) {
      return Promise.resolve({ data: this._data, error: this._error }).then(resolve);
    },
  };

  return builder;
};

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockQueryBuilders: Record<string, ReturnType<typeof createMockQueryBuilder>> = {};

  const client = {
    from: vi.fn((table: string) => {
      if (!mockQueryBuilders[table]) {
        mockQueryBuilders[table] = createMockQueryBuilder();
      }
      return mockQueryBuilders[table];
    }),

    // Helper to set mock data for a table
    __setMockData: (table: string, data: any, error: any = null) => {
      if (!mockQueryBuilders[table]) {
        mockQueryBuilders[table] = createMockQueryBuilder();
      }
      mockQueryBuilders[table]._data = data;
      mockQueryBuilders[table]._error = error;
      return client;
    },

    // Helper to get mock builder for assertions
    __getMockBuilder: (table: string) => mockQueryBuilders[table],

    // Reset all mocks
    __reset: () => {
      Object.keys(mockQueryBuilders).forEach((key) => {
        delete mockQueryBuilders[key];
      });
    },
  };

  return client;
};

// Type for mock client
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
