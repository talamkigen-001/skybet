import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CasinoState {
  favorites: string[];
  recent: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  markPlayed: (id: string) => void;
}

export const useCasino = create<CasinoState>()(
  persist(
    (set, get) => ({
      favorites: [],
      recent: [],
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [id, ...s.favorites].slice(0, 100),
        })),
      isFavorite: (id) => get().favorites.includes(id),
      markPlayed: (id) =>
        set((s) => ({
          recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 30),
        })),
    }),
    { name: "aurora-casino-v1" },
  ),
);
