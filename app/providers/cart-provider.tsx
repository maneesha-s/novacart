"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  isLoaded: boolean;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  totalItems: number;
  totalAmount: number;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Load cart from localStorage after component mounts
  useEffect(() => {
    // Defer storage hydration until after the initial server/client render.
    const timer = setTimeout(() => {
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem("novacart-cart") ?? "[]");
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((item): item is CartItem =>
            typeof item?.id === "string" && typeof item?.name === "string" &&
            Number.isFinite(item?.price) && item.price >= 0 &&
            Number.isSafeInteger(item?.quantity) && item.quantity > 0));
        }
      } catch { /* A corrupt or inaccessible cart starts empty. */ }
      setIsLoaded(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save whenever cart changes,
  // but only after initial localStorage load
  useEffect(() => {
    if (!isLoaded) return;

    try { localStorage.setItem("novacart-cart", JSON.stringify(items)); } catch { /* Storage may be disabled. */ }
  }, [items, isLoaded]);

  function addItem(item: Omit<CartItem, "quantity">) {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (current) => current.id === item.id,
      );

      if (existingItem) {
        return currentItems.map((current) =>
          current.id === item.id
            ? {
                ...current,
                quantity: current.quantity + 1,
              }
            : current,
        );
      }

      return [
        ...currentItems,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  }

  function removeItem(id: string) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item,
      ),
    );
  }

  const totalItems = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        isLoaded,
        addItem,
        removeItem,
        updateQuantity,
        totalItems,
        totalAmount,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}

// function clearCart() {
//   setItems([]);
// }
