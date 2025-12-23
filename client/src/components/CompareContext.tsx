import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CompareContextValue = {
  items: string[];
  isCompared: (id: string) => boolean;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  replace: (ids: string[]) => void;
  count: number;
  maxItems: number;
};

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

const LS_KEY = "compare:v1";
const MAX_ITEMS = 4;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      const filtered = parsed.filter((x) => typeof x === "string");
      return Array.from(new Set(filtered)).slice(0, MAX_ITEMS);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CompareContextValue>(() => {
    const setUnique = (next: string[]) => Array.from(new Set(next)).slice(0, MAX_ITEMS);
    const isCompared = (id: string) => items.includes(id);
    const add = (id: string) =>
      setItems((prev) => {
        if (prev.includes(id)) return prev;
        if (prev.length >= MAX_ITEMS) return prev;
        return setUnique([...prev, id]);
      });
    const remove = (id: string) => setItems((prev) => prev.filter((x) => x !== id));
    const toggle = (id: string) =>
      setItems((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX_ITEMS) return prev;
        return setUnique([...prev, id]);
      });
    const clear = () => setItems([]);
    const replace = (ids: string[]) => setItems(setUnique(ids.filter((x) => typeof x === "string")));
    const count = items.length;
    return { items, isCompared, add, remove, toggle, clear, replace, count, maxItems: MAX_ITEMS };
  }, [items]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}

