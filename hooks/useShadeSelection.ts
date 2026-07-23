"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ShadeData } from "@/types";

/** Separate key — pure backup, not auto-loaded on refresh */
export const SAVED_SHADES_KEY = "shade-finder-saved-shades";

export function readSavedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_SHADES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSavedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_SHADES_KEY, JSON.stringify(ids));
  } catch {}
}

interface ShadeStore {
  selectedShade: ShadeData | null;
  compareShades: ShadeData[];
  /** Session-only — always starts empty on refresh */
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
  /** Load backed-up IDs into the current session */
  restoreFavorites: (ids: string[]) => void;
  setFilter: (key: string, value: string | number | null) => void;
  clearFilters: () => void;
  setOpacity: (v: number) => void;
}

export const useShadeStore = create<ShadeStore>()(
  persist(
    (set) => ({
      selectedShade: null,
      compareShades: [],
      favoriteIds: [],          // starts empty every session
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
        set((s) => {
          const next = s.favoriteIds.includes(shadeId)
            ? s.favoriteIds.filter((id) => id !== shadeId)
            : [...s.favoriteIds, shadeId];
          // Keep backup in sync so restore works next session
          writeSavedIds(next);
          return { favoriteIds: next };
        }),

      restoreFavorites: (ids) => set({ favoriteIds: ids }),

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
      // Only opacity persists — everything else resets on refresh
      partialize: (s) => ({
        opacity: s.opacity,
      }),
    }
  )
);

export function useShadeSelection() {
  return useShadeStore();
}
