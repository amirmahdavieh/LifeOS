import { create } from 'zustand';
import type { Spending, SpendingDraft, Subscription, SubscriptionDraft } from '../types';

const SPENDING_BASE = '/api/spending';
const SUBSCRIPTIONS_BASE = '/api/subscriptions';

interface FinanceStore {
  spending: Spending[];
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  addSpending: (draft: SpendingDraft) => Promise<void>;
  updateSpending: (id: string, updates: Partial<Omit<Spending, 'id'>>) => Promise<void>;
  deleteSpending: (id: string) => Promise<void>;
  addSubscription: (draft: SubscriptionDraft) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Omit<Subscription, 'id'>>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  spending: [],
  subscriptions: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [spendingRes, subsRes] = await Promise.all([fetch(SPENDING_BASE), fetch(SUBSCRIPTIONS_BASE)]);
      if (!spendingRes.ok) throw new Error(await parseErrorMessage(spendingRes, 'Failed to load spending'));
      if (!subsRes.ok) throw new Error(await parseErrorMessage(subsRes, 'Failed to load subscriptions'));
      const spending: Spending[] = await spendingRes.json();
      const subscriptions: Subscription[] = await subsRes.json();
      set({ spending, subscriptions, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addSpending: async (draft) => {
    const res = await fetch(SPENDING_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const message = await parseErrorMessage(res, 'Failed to create spending entry');
      set({ error: message });
      throw new Error(message);
    }
    const entry: Spending = await res.json();
    set((state) => ({ spending: [...state.spending, entry], error: null }));
  },

  updateSpending: async (id, updates) => {
    const previous = get().spending;
    set((state) => ({ spending: state.spending.map((s) => (s.id === id ? { ...s, ...updates } : s)) }));
    try {
      const res = await fetch(`${SPENDING_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to update spending entry'));
      const entry: Spending = await res.json();
      set((state) => ({ spending: state.spending.map((s) => (s.id === id ? entry : s)), error: null }));
    } catch (e) {
      set({ spending: previous, error: (e as Error).message });
      throw e;
    }
  },

  deleteSpending: async (id) => {
    const previous = get().spending;
    set((state) => ({ spending: state.spending.filter((s) => s.id !== id) }));
    try {
      const res = await fetch(`${SPENDING_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(await parseErrorMessage(res, 'Failed to delete spending entry'));
    } catch (e) {
      set({ spending: previous, error: (e as Error).message });
      throw e;
    }
  },

  addSubscription: async (draft) => {
    const res = await fetch(SUBSCRIPTIONS_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const message = await parseErrorMessage(res, 'Failed to create subscription');
      set({ error: message });
      throw new Error(message);
    }
    const sub: Subscription = await res.json();
    set((state) => ({ subscriptions: [...state.subscriptions, sub], error: null }));
  },

  updateSubscription: async (id, updates) => {
    const previous = get().subscriptions;
    set((state) => ({
      subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    try {
      const res = await fetch(`${SUBSCRIPTIONS_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to update subscription'));
      const sub: Subscription = await res.json();
      set((state) => ({ subscriptions: state.subscriptions.map((s) => (s.id === id ? sub : s)), error: null }));
    } catch (e) {
      set({ subscriptions: previous, error: (e as Error).message });
      throw e;
    }
  },

  deleteSubscription: async (id) => {
    const previous = get().subscriptions;
    set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }));
    try {
      const res = await fetch(`${SUBSCRIPTIONS_BASE}/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error(await parseErrorMessage(res, 'Failed to delete subscription'));
    } catch (e) {
      set({ subscriptions: previous, error: (e as Error).message });
      throw e;
    }
  },
}));
