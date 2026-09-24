import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { SpendingModal } from './SpendingModal';
import { addMonths, formatCurrency, formatMonthLabel, formatShortDate, getMonthStart, groupByCategory, isInMonth } from '../utils';
import { formatDateKey } from '../../utils/date';
import type { Spending, SpendingDraft } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';

type ModalState = { mode: 'create' | 'edit'; draft: SpendingDraft } | null;

export function SpendingView() {
  const spending = useFinanceStore((s) => s.spending);
  const addSpending = useFinanceStore((s) => s.addSpending);
  const updateSpending = useFinanceStore((s) => s.updateSpending);
  const deleteSpending = useFinanceStore((s) => s.deleteSpending);

  const [monthStart, setMonthStart] = useState(() => getMonthStart(new Date()));
  const [modal, setModal] = useState<ModalState>(null);

  const monthSpending = useMemo(
    () =>
      spending
        .filter((s) => isInMonth(s.date, monthStart))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [spending, monthStart]
  );
  const total = monthSpending.reduce((sum, s) => sum + s.amount, 0);
  const categoryTotals = useMemo(() => groupByCategory(monthSpending), [monthSpending]);

  function openCreateModal() {
    setModal({
      mode: 'create',
      draft: {
        amount: 0,
        date: formatDateKey(new Date()),
        category: EXPENSE_CATEGORIES[0],
        merchant: '',
        notes: '',
        paymentMethod: '',
      },
    });
  }

  function openEditModal(entry: Spending) {
    setModal({ mode: 'edit', draft: entry });
  }

  function handleSave(draft: SpendingDraft) {
    const request =
      modal?.mode === 'edit' && draft.id
        ? updateSpending(draft.id, {
            amount: draft.amount,
            date: draft.date,
            category: draft.category,
            merchant: draft.merchant,
            notes: draft.notes,
            paymentMethod: draft.paymentMethod,
          })
        : addSpending(draft);
    request.catch(() => {});
    setModal(null);
  }

  function handleDelete() {
    if (modal?.mode === 'edit' && modal.draft.id) {
      deleteSpending(modal.draft.id).catch(() => {});
    }
    setModal(null);
  }

  return (
    <div className="finance-page">
      <div className="finance-page__toolbar">
        <div className="month-nav">
          <button className="btn btn--ghost" onClick={() => setMonthStart((m) => addMonths(m, -1))} aria-label="Previous month">
            {'←'}
          </button>
          <span className="month-nav__label">{formatMonthLabel(monthStart)}</span>
          <button className="btn btn--ghost" onClick={() => setMonthStart((m) => addMonths(m, 1))} aria-label="Next month">
            {'→'}
          </button>
        </div>
        <button className="btn btn--primary" onClick={openCreateModal}>
          + Add Spending
        </button>
      </div>

      <div className="finance-summary-cards">
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(total)}</div>
          <div className="summary-card__label">Total spent</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{monthSpending.length}</div>
          <div className="summary-card__label">Transactions</div>
        </div>
      </div>

      <section className="finance-section">
        <h3>Spending by Category</h3>
        {categoryTotals.length === 0 ? (
          <p className="review__empty">No spending recorded this month.</p>
        ) : (
          <div className="category-bars">
            {categoryTotals.map(({ category, total: catTotal }) => (
              <div className="category-bar" key={category}>
                <span className="category-bar__label">{category}</span>
                <span className="category-bar__value">{formatCurrency(catTotal)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="finance-section">
        <h3>Entries</h3>
        {monthSpending.length === 0 ? (
          <p className="review__empty">No spending recorded this month.</p>
        ) : (
          <ul className="finance-list">
            {monthSpending.map((s) => (
              <li
                key={s.id}
                className="finance-list__row finance-list__row--clickable"
                onClick={() => openEditModal(s)}
              >
                <div className="finance-list__main">
                  <span className="finance-list__title">{s.merchant}</span>
                  <span className="finance-list__meta">
                    {s.category}
                    {s.paymentMethod ? ` · ${s.paymentMethod}` : ''} · {formatShortDate(s.date)}
                  </span>
                </div>
                <span className="finance-list__amount">{formatCurrency(s.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <SpendingModal
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
