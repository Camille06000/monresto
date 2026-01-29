import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language, Profile } from '../lib/types';

interface AppState {
  profile: Profile | null;
  language: Language;
  setProfile: (profile: Profile | null) => void;
  setLanguage: (lang: Language) => void;
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      language: 'fr',
      setProfile: (profile) => set({ profile, language: profile?.language ?? 'fr' }),
      setLanguage: (language) => set({ language }),
      reset: () => set({ profile: null, language: 'fr' }),
    }),
    { name: 'monresto-store' },
  ),
);
