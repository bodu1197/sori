import { jest } from '@jest/globals';

export const supabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  })),
  removeChannel: jest.fn(),
};
