import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

// Legacy keys from before the JWT was kept only in the persisted 'auth-storage' entry.
const clearLegacyAuthKeys = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        clearLegacyAuthKeys();
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        clearLegacyAuthKeys();
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);