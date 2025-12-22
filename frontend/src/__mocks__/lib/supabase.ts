import { jest } from '@jest/globals';

// Helper functions to reduce nesting
const createMaybeSingleResponse = () => Promise.resolve({ data: null, error: null });

const createSingleResponse = () => Promise.resolve({ data: null, error: null });

const createArrayResponse = () => Promise.resolve({ data: [], error: null });

const createInsertResponse = () => Promise.resolve({ data: { id: 'test-id' }, error: null });

// Mock chain builders
const buildInnerEq = () => ({
  maybeSingle: jest.fn(createMaybeSingleResponse),
  single: jest.fn(createSingleResponse),
});

const buildEqWithOrder = () => ({
  maybeSingle: jest.fn(createMaybeSingleResponse),
  single: jest.fn(createSingleResponse),
  eq: jest.fn(buildInnerEq),
  order: jest.fn(() => ({
    limit: jest.fn(createArrayResponse),
  })),
});

const buildSelect = () => ({
  eq: jest.fn(buildEqWithOrder),
});

const buildInsertSelect = () => ({
  single: jest.fn(createInsertResponse),
});

const buildDeleteEq = () => ({
  eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
});

export const supabase = {
  from: jest.fn(() => ({
    select: jest.fn(buildSelect),
    insert: jest.fn(() => ({
      select: jest.fn(buildInsertSelect),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(buildDeleteEq),
    })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
  })),
  removeChannel: jest.fn(),
};
