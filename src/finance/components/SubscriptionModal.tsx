import { useEffect, useState } from 'react';
import type { SubscriptionDraft } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';

interface SubscriptionModalProps {
  mode: 'create' | 'edit';
  initial: SubscriptionDraft;
  onSave: (draft: SubscriptionDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  monthlyPrice: string;
  billingDate: string;
  category: string;
  notes: string;
  active: boolean;
}

function toFormState(draft: SubscriptionDraft): FormState {
  return {
    name: draft.name ?? '',
    monthlyPrice: draft.monthlyPrice ? String(draft.monthlyPrice) : '',
    billingDate: draft.billingDate ? String(draft.billingDate) : '1',
    category: draft.category ?? '',
    notes: draft.notes ?? '',
    active: draft.active ?? true,
  };
}

export function SubscriptionModal({ mode, initial, onSave, onDelete, onClose }: SubscriptionModalProps) {
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
    const name = form.name.trim();
    const price = parseFloat(form.monthlyPrice);
    const billingDate = parseInt(form.billingDate, 10);
    if (!name) {
      setError('Name is required.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setError('Enter a valid monthly price.');
      return;
    }
    if (!Number.isInteger(billingDate) || billingDate < 1 || billingDate > 31) {
      setError('Billing date must be between 1 and 31.');
      return;
    }
    setError(null);
    onSave({
      id: initial.id,
      name,
      monthlyPrice: price,
      billingDate,
      category: form.category || undefined,
      notes: form.notes.trim() || undefined,
      active: form.active,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>{mode === 'create' ? 'Add Subscription' : 'Subscription Details'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            {'×'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal__form">
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Spotify"
              autoFocus
              maxLength={120}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Monthly price (€)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyPrice}
                onChange={(e) => setForm((f) => ({ ...f, monthlyPrice: e.target.value }))}
                placeholder="0.00"
              />
            </label>
            <label className="field">
              <span>Billing date</span>
              <input
                type="number"
                min="1"
                max="31"
                step="1"
                value={form.billingDate}
                onChange={(e) => setForm((f) => ({ ...f, billingDate: e.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span>Category (optional)</span>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              <option value="">{'—'}</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

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

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>Active</span>
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
                {mode === 'create' ? 'Add Subscription' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
