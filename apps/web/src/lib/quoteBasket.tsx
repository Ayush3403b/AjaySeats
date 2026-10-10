import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LocalizedText } from '@pcs/shared';

export interface BasketItem {
  productId: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  quantity: number;
}

interface BasketValue {
  items: BasketItem[];
  add: (item: Omit<BasketItem, 'quantity'>) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
  has: (productId: string) => boolean;
}

const STORAGE_KEY = 'pcs-quote-basket';
const MAX_ITEMS = 10;
const BasketContext = createContext<BasketValue | null>(null);

function readBasket(): BasketItem[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as BasketItem[]).slice(0, MAX_ITEMS) : [];
  } catch {
    return [];
  }
}

/** "Add to quote" list. Persisted in localStorage and pre-fills the quote form. */
export function QuoteBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>(readBasket);
  // Mirrors `items` synchronously so add() can report success without waiting for React's state updater.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full or blocked: the list still works for this visit */
    }
  }, [items]);

  const add = useCallback((item: Omit<BasketItem, 'quantity'>) => {
    const current = itemsRef.current;
    if (current.some((c) => c.productId === item.productId)) return false;
    if (current.length >= MAX_ITEMS) return false;
    const next = [...current, { ...item, quantity: 1 }];
    itemsRef.current = next;
    setItems(next);
    return true;
  }, []);

  const remove = useCallback((productId: string) => setItems((c) => c.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  const value = useMemo(() => ({ items, add, remove, clear, has }), [items, add, remove, clear, has]);
  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useQuoteBasket(): BasketValue {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error('useQuoteBasket must be used inside QuoteBasketProvider');
  return ctx;
}
