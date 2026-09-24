export interface Spending {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
  merchant: string;
  notes?: string;
  paymentMethod?: string;
}

export type SpendingDraft = Omit<Spending, 'id'> & { id?: string };

export interface Subscription {
  id: string;
  name: string;
  monthlyPrice: number;
  billingDate: number; // day of month, 1-31
  category?: string;
  notes?: string;
  active: boolean;
}

export type SubscriptionDraft = Omit<Subscription, 'id'> & { id?: string };
