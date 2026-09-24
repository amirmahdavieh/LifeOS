import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatDateKey } from '../../utils/date';
import { formatCurrency, formatShortDate, getMonthStart, getUpcomingPayments, groupByCategory, isInMonth } from '../utils';

interface OverviewProps {
  onNavigate: (tab: 'spending' | 'subscriptions') => void;
}

export function Overview({ onNavigate }: OverviewProps) {
  const spending = useFinanceStore((s) => s.spending);
  const subscriptions = useFinanceStore((s) => s.subscriptions);

  const monthStart = useMemo(() => getMonthStart(new Date()), []);
  const monthSpending = useMemo(() => spending.filter((s) => isInMonth(s.date, monthStart)), [spending, monthStart]);
  const spentThisMonth = monthSpending.reduce((sum, s) => sum + s.amount, 0);
  const activeSubs = subscriptions.filter((s) => s.active);
  const monthlySubTotal = activeSubs.reduce((sum, s) => sum + s.monthlyPrice, 0);
  const totalExpected = spentThisMonth + monthlySubTotal;

  const categoryTotals = useMemo(() => groupByCategory(monthSpending), [monthSpending]);
  const recentSpending = useMemo(
    () => [...spending].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [spending]
  );
  const upcoming = useMemo(() => getUpcomingPayments(subscriptions, new Date(), 5), [subscriptions]);

  return (
    <div className="finance-page">
      <div className="finance-summary-cards">
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(spentThisMonth)}</div>
          <div className="summary-card__label">Spent this month</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(monthlySubTotal)}</div>
          <div className="summary-card__label">Monthly subscriptions</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{formatCurrency(totalExpected)}</div>
          <div className="summary-card__label">Total expected monthly spending</div>
        </div>
      </div>

      <div className="finance-columns">
        <section className="finance-section">
          <div className="finance-section__header">
            <h3>Spending by Category</h3>
            <button className="btn btn--ghost btn--small" onClick={() => onNavigate('spending')}>
              View all
            </button>
          </div>
          {categoryTotals.length === 0 ? (
            <p className="review__empty">No spending recorded this month.</p>
          ) : (
            <div className="category-bars">
              {categoryTotals.map(({ category, total }) => (
                <div className="category-bar" key={category}>
                  <span className="category-bar__label">{category}</span>
                  <span className="category-bar__value">{formatCurrency(total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="finance-section">
          <div className="finance-section__header">
            <h3>Recent Spending</h3>
            <button className="btn btn--ghost btn--small" onClick={() => onNavigate('spending')}>
              View all
            </button>
          </div>
          {recentSpending.length === 0 ? (
            <p className="review__empty">No spending recorded yet.</p>
          ) : (
            <ul className="finance-list">
              {recentSpending.map((s) => (
                <li key={s.id} className="finance-list__row">
                  <div className="finance-list__main">
                    <span className="finance-list__title">{s.merchant}</span>
                    <span className="finance-list__meta">
                      {s.category} · {formatShortDate(s.date)}
                    </span>
                  </div>
                  <span className="finance-list__amount">{formatCurrency(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="finance-section">
          <div className="finance-section__header">
            <h3>Upcoming Payments</h3>
            <button className="btn btn--ghost btn--small" onClick={() => onNavigate('subscriptions')}>
              View all
            </button>
          </div>
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
      </div>
    </div>
  );
}
