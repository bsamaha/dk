import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppState, PlayerFilter } from '../types';

interface AppStore extends AppState {
  // Mobile state
  isMobileMenuOpen: boolean;

  // Actions
  setSelectedPlayers: (players: string[]) => void;
  addSelectedPlayer: (player: string) => void;
  removeSelectedPlayer: (player: string) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  setFilters: (filters: Partial<PlayerFilter>) => void;
  clearFilters: () => void;
  toggleMobileMenu: () => void;
}

const initialFilters: PlayerFilter = {
  positions: [],
  search_term: '',
  limit: 50,
  offset: 0,
};

export const useAppStore = create<AppStore>()(
  devtools(
    set => ({
      // Initial state
      selectedPlayers: [],
      currentView: 'overview',
      filters: initialFilters,
      isMobileMenuOpen: false,

      // Actions
      setSelectedPlayers: players =>
        set({ selectedPlayers: players }, false, 'setSelectedPlayers'),

      addSelectedPlayer: player =>
        set(
          state => ({
            selectedPlayers: [...state.selectedPlayers, player],
          }),
          false,
          'addSelectedPlayer'
        ),

      removeSelectedPlayer: player =>
        set(
          state => ({
            selectedPlayers: state.selectedPlayers.filter(p => p !== player),
          }),
          false,
          'removeSelectedPlayer'
        ),

      setCurrentView: view =>
        set({ currentView: view }, false, 'setCurrentView'),

      setFilters: newFilters =>
        set(
          state => ({
            filters: { ...state.filters, ...newFilters },
          }),
          false,
          'setFilters'
        ),

      clearFilters: () =>
        set({ filters: initialFilters }, false, 'clearFilters'),

      toggleMobileMenu: () =>
        set(
          state => ({ isMobileMenuOpen: !state.isMobileMenuOpen }),
          false,
          'toggleMobileMenu'
        ),
    }),
    {
      name: 'fantasy-analytics-store',
    }
  )
);
