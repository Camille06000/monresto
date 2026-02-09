import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, Profile, Restaurant } from '../lib/types';

interface AppState {
  profile: Profile | null;
  language: Language;
  currentRestaurant: Restaurant | null;
  setProfile: (profile: Profile | null) => void;
  setLanguage: (lang: Language) => void;
  setCurrentRestaurant: (restaurant: Restaurant | null) => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      language: 'fr',
      currentRestaurant: null,
      setProfile: (profile) => set({ profile, language: profile?.language ?? 'fr' }),
      setLanguage: (language) => set({ language }),
      setCurrentRestaurant: (currentRestaurant) => set({ currentRestaurant }),
      reset: () => set({ profile: null, language: 'fr', currentRestaurant: null }),
    }),
    { name: 'monresto-store' },
  ),
);
