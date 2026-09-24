import { useEffect, useState } from 'react';
import type { SpendingDraft } from '../types';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { formatDateKey } from '../../utils/date';

interface SpendingModalProps {
  mode: 'create' | 'edit';
  initial: SpendingDraft;
  onSave: (draft: SpendingDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

interface FormState {
  amount: string;
  date: string;
  category: string;
  merchant: string;
  notes: string;
  paymentMethod: string;
}

function toFormState(draft: SpendingDraft): FormState {
  return {
    amount: draft.amount ? String(draft.amount) : '',
    date: draft.date ?? formatDateKey(new Date()),
    category: draft.category ?? EXPENSE_CATEGORIES[0],
    merchant: draft.merchant ?? '',
    notes: draft.notes ?? '',
    paymentMethod: draft.paymentMethod ?? '',
  };
}

export function SpendingModal({ mode, initial, onSave, onDelete, onClose }: SpendingModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormState(initial));
  }, [initial]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const merchant = form.merchant.trim();
    const amount = parseFloat(form.amount);
    if (!merchant) {
      setError('Merchant / description is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setError(null);
    onSave({
      id: initial.id,
      amount,
      date: form.date,
      category: form.category,
      merchant,
      notes: form.notes.trim() || undefined,
      paymentMethod: form.paymentMethod || undefined,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>{mode === 'create' ? 'Add Spending' : 'Spending Details'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            {'×'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal__form">
          <div className="field-row">
            <label className="field">
              <span>Amount (€)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                autoFocus
              />
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span>Merchant / description</span>
            <input
              type="text"
              value={form.merchant}
              onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
              placeholder="e.g. Lidl"
              maxLength={120}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Payment method (optional)</span>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              >
                <option value="">{'—'}</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add any details..."
              rows={3}
              maxLength={2000}
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <div className="modal__actions">
            {mode === 'edit' && onDelete && (
              <button type="button" className="btn btn--danger" onClick={onDelete}>
                Delete
              </button>
            )}
            <div className="modal__actions-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                {mode === 'create' ? 'Add Spending' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
