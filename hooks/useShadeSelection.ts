"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShadeData } from "@/types";

interface ShadeStore {
  selectedShade: ShadeData | null;
  compareShades: ShadeData[];
  favoriteIds: string[];
  activeFilter: {
    colorFamily: string | null;
    finish: string | null;
    undertone: string | null;
    occasion: string | null;
    priceMax: number | null;
  };
  opacity: number;

  selectShade: (shade: ShadeData | null) => void;
  addToCompare: (shade: ShadeData) => void;
  removeFromCompare: (shadeId: string) => void;
  clearCompare: () => void;
  toggleFavorite: (shadeId: string) => void;
  setFilter: (key: string, value: string | number | null) => void;
  clearFilters: () => void;
  setOpacity: (v: number) => void;
}

export const useShadeStore = create<ShadeStore>()(
  persist(
    (set) => ({
      selectedShade: null,
      compareShades: [],
      favoriteIds: [],
      activeFilter: {
        colorFamily: null,
        finish: null,
        undertone: null,
        occasion: null,
        priceMax: null,
      },
      opacity: 0.75,

      selectShade: (shade) => set({ selectedShade: shade }),

      addToCompare: (shade) =>
        set((s) => {
          if (s.compareShades.find((c) => c.shadeId === shade.shadeId))
            return s;
          if (s.compareShades.length >= 3) {
            return { compareShades: [...s.compareShades.slice(1), shade] };
          }
          return { compareShades: [...s.compareShades, shade] };
        }),

      removeFromCompare: (shadeId) =>
        set((s) => ({
          compareShades: s.compareShades.filter((c) => c.shadeId !== shadeId),
        })),

      clearCompare: () => set({ compareShades: [] }),

      toggleFavorite: (shadeId) =>
        set((s) => ({
          favoriteIds: s.favoriteIds.includes(shadeId)
            ? s.favoriteIds.filter((id) => id !== shadeId)
            : [...s.favoriteIds, shadeId],
        })),

      setFilter: (key, value) =>
        set((s) => ({
          activeFilter: { ...s.activeFilter, [key]: value },
        })),

      clearFilters: () =>
        set({
          activeFilter: {
            colorFamily: null,
            finish: null,
            undertone: null,
            occasion: null,
            priceMax: null,
          },
        }),

      setOpacity: (v) => set({ opacity: v }),
    }),
    {
      name: "shade-finder-store",
      partialize: (s) => ({
        favoriteIds: s.favoriteIds,
        opacity: s.opacity,
      }),
    }
  )
);

export function useShadeSelection() {
  return useShadeStore();
}
