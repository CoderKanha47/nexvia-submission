import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  avatarUrl?: string;
  isActive: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const STORAGE_KEY = 'lms-auth';

function loadFromStorage(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed.accessToken && parsed.user) {
      return { user: parsed.user, accessToken: parsed.accessToken, isAuthenticated: true, isLoading: false };
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

function saveToStorage(state: AuthState) {
  try {
    if (state.accessToken && state.user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, accessToken: state.accessToken }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      saveToStorage(state);
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      saveToStorage(state);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      saveToStorage(state);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    initializeAuth: (state) => {
      const stored = loadFromStorage();
      state.user = stored.user ?? null;
      state.accessToken = stored.accessToken ?? null;
      state.isAuthenticated = !!stored.accessToken && !!stored.user;
      state.isLoading = false;
    },
  },
});

export const { setCredentials, setUser, clearCredentials, setLoading, initializeAuth } = authSlice.actions;
export default authSlice.reducer;