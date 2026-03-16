import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CartItem {
  id: string;
  type: 'subscription' | 'addon' | 'plan_change' | 'renewal' | 'offer_change' | 'extension' | 'adjustment';
  customerId: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  duration?: string;
  details: {
    planId?: string;
    addonId?: string;
    currentPlanId?: string;
    newPlanId?: string;
    validityMonths?: number;
    adjustmentType?: string;
    adjustmentAmount?: number;
    notes?: string;
    scheduledDate?: Date;
    [key: string]: any;
  };
  addedAt: Date;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  getItemsByCustomer: (customerId: string) => CartItem[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((newItem: Omit<CartItem, 'id' | 'addedAt'>) => {
    const item: CartItem = {
      ...newItem,
      id: `${newItem.type}_${newItem.customerId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date(),
    };
    
    setItems(prev => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getItemsByCustomer = useCallback((customerId: string) => {
    return items.filter(item => item.customerId === customerId);
  }, [items]);

  const itemCount = items.length;
  const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

  const value: CartContextType = {
    items,
    itemCount,
    totalAmount,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    getItemsByCustomer,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}