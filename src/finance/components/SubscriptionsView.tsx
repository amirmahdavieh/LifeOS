import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { SubscriptionModal } from './SubscriptionModal';
import { formatCurrency, formatShortDate, getUpcomingPayments } from '../utils';
import { formatDateKey } from '../../utils/date';
import type { Subscription, SubscriptionDraft } from '../types';

type ModalState = { mode: 'create' | 'edit'; draft: SubscriptionDraft } | null;

function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

export function SubscriptionsView() {
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const addSubscription = useFinanceStore((s) => s.addSubscription);
  const updateSubscription = useFinanceStore((s) => s.updateSubscription);
  const deleteSubscription = useFinanceStore((s) => s.deleteSubscription);

  const [modal, setModal] = useState<ModalState>(null);

  const sorted = useMemo(() => [...subscriptions].sort((a, b) => a.name.localeCompare(b.name)), [subscriptions]);
  const activeSubs = subscriptions.filter((s) => s.active);
  const monthlyTotal = activeSubs.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const yearlyTotal = monthlyTotal * 12;
  const upcoming = useMemo(() => getUpcomingPayments(subscriptions, new Date(), 5), [subscriptions]);

  function openCreateModal() {
    setModal({
      mode: 'create',
      draft: { name: '', monthlyPrice: 0, billingDate: 1, category: '', notes: '', active: true },
    });
  }

  function openEditModal(sub: Subscription) {
    setModal({ mode: 'edit', draft: sub });
  }

  function handleSave(draft: SubscriptionDraft) {
    const request =
      modal?.mode === 'edit' && draft.id
        ? updateSubscription(draft.id, {
            name: draft.name,
            monthlyPrice: draft.monthlyPrice,
            billingDate: draft.billingDate,
            category: draft.category,
            notes: draft.notes,
            active: draft.active,
          })
        : addSubscription(draft);
    request.catch(() => {});
    setModal(null);
  }

  function handleDelete() {
    if (modal?.mode === 'edit' && modal.draft.id) {
      deleteSubscription(modal.draft.id).catch(() => {});
    }
    setModal(null);
  }

  return (
    <div className="finance-page">
      <div className="finance-page__toolbar">
        <h3 className="finance-page__heading">Monthly Subscriptions</h3>
        <button className="btn btn--primary" onClick={openCreateModal}>
          + Add Subscription
        </button>
      </div>

      <div className="finance-summary-cards">
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(monthlyTotal)}</div>
          <div className="summary-card__label">Total monthly cost</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{activeSubs.length}</div>
          <div className="summary-card__label">Active subscriptions</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(yearlyTotal)}</div>
          <div className="summary-card__label">Yearly cost</div>
        </div>
      </div>

      <section className="finance-section">
        <h3>Upcoming Payments</h3>
        {upcoming.length === 0 ? (
          <p className="review__empty">No active subscriptions.</p>
        ) : (
          <ul className="finance-list">
            {upcoming.map(({ subscription, date }) => (
              <li key={subscription.id} className="finance-list__row">
                <div className="finance-list__main">
                  <span className="finance-list__title">{subscription.name}</span>
                  <span className="finance-list__meta">{formatShortDate(formatDateKey(date))}</span>
                </div>
                <span className="finance-list__amount">{formatCurrency(subscription.monthlyPrice)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="finance-section">
        <h3>All Subscriptions</h3>
        {sorted.length === 0 ? (
          <p className="review__empty">No subscriptions yet.</p>
        ) : (
          <ul className="finance-list">
            {sorted.map((sub) => (
              <li
                key={sub.id}
                className={`finance-list__row finance-list__row--clickable${sub.active ? '' : ' finance-list__row--inactive'}`}
                onClick={() => openEditModal(sub)}
              >
                <div className="finance-list__main">
                  <span className="finance-list__title">
                    {sub.name}
                    {!sub.active && <span className="finance-badge finance-badge--inactive">Inactive</span>}
                  </span>
                  <span className="finance-list__meta">
                    {sub.category ? `${sub.category} · ` : ''}Billing date: {ordinal(sub.billingDate)}
                  </span>
                </div>
                <span className="finance-list__amount">{formatCurrency(sub.monthlyPrice)} / month</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <SubscriptionModal
          mode={modal.mode}
          initial={modal.draft}
          onSave={handleSave}
          onDelete={modal.mode === 'edit' ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
