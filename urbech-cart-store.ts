"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type CartItems = Record<string, number>;

type CartStore = {
  items: CartItems;
  addItem: (slug: string) => void;
  decrementItem: (slug: string) => void;
  removeItem: (slug: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: {},
      addItem: (slug) =>
        set((state) => ({
          items: {
            ...state.items,
            [slug]: (state.items[slug] ?? 0) + 1,
          },
        })),
      decrementItem: (slug) =>
        set((state) => {
          const current = state.items[slug] ?? 0;

          if (current <= 1) {
            const next = { ...state.items };
            delete next[slug];
            return { items: next };
          }

          return {
            items: {
              ...state.items,
              [slug]: current - 1,
            },
          };
        }),
      removeItem: (slug) =>
        set((state) => {
          const next = { ...state.items };
          delete next[slug];
          return { items: next };
        }),
      clearCart: () => set({ items: {} }),
    }),
    {
      name: "dagestanskie-delikatesy-cart",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function getCartItemsCount(items: CartItems) {
  return Object.values(items).reduce((sum, quantity) => sum + quantity, 0);
}
