import create from 'zustand';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password,
      });
      
      set({
        user: response.data.user,
        token: response.data.accessToken,
        isLoading: false,
      });

      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      return true;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false,
      });
      return false;
    }
  },

  register: async (username, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password,
      });
      
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false,
      });
      return null;
    }
  },

  logout: () => {
    set({ user: null, token: null });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      set({ token });
    }
  },
}));

export const useGameStore = create((set) => ({
  games: [],
  isLoading: false,
  error: null,

  fetchGames: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_URL}/games`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ games: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },
}));

export const useCatalogStore = create((set) => ({
  items: [],
  isLoading: false,
  error: null,

  fetchCatalog: async (token, category) => {
    set({ isLoading: true, error: null });
    try {
      const url = category ? `${API_URL}/catalog?category=${category}` : `${API_URL}/catalog`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      set({ items: response.data, isLoading: false });
    } catch (error) {
      set({
        error: error.message,
        isLoading: false,
      });
    }
  },

  purchaseItem: async (token, itemId, price) => {
    try {
      await axios.post(
        `${API_URL}/catalog/purchase`,
        { itemId, price },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },
}));
