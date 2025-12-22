import { createContext, useContext, useEffect, useMemo, useState } from "react";

type WishlistContextValue = {
  items: string[];
  isSaved: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  replace: (ids: string[]) => void;
  count: number;
};

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

const LS_KEY = "wishlist:v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<WishlistContextValue>(() => {
    const setUnique = (next: string[]) => Array.from(new Set(next));
    const isSaved = (id: string) => items.includes(id);
    const add = (id: string) => setItems((prev) => setUnique([...prev, id]));
    const remove = (id: string) => setItems((prev) => prev.filter((x) => x !== id));
    const toggle = (id: string) => setItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : setUnique([...prev, id])));
    const replace = (ids: string[]) => setItems(setUnique(ids.filter((x) => typeof x === "string")));
    const count = items.length;
    return { items, isSaved, add, remove, toggle, replace, count };
  }, [items]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
