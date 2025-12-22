import { jest } from '@jest/globals';

const useAuthStore = jest.fn(() => ({
  user: { id: 'test-user-id', user_metadata: { avatar_url: null } },
  session: null,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
}));

export default useAuthStore;
