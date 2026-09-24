import { useEffect, useState } from 'react';
import { useFinanceStore } from './store/useFinanceStore';
import { Overview } from './components/Overview';
import { SpendingView } from './components/SpendingView';
import { SubscriptionsView } from './components/SubscriptionsView';
import './finance.css';

type FinanceTab = 'overview' | 'spending' | 'subscriptions';

export function FinanceApp() {
  const loadAll = useFinanceStore((s) => s.loadAll);
  const loading = useFinanceStore((s) => s.loading);
  const error = useFinanceStore((s) => s.error);
  const spending = useFinanceStore((s) => s.spending);
  const subscriptions = useFinanceStore((s) => s.subscriptions);
  const [tab, setTab] = useState<FinanceTab>('overview');

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const isInitialLoad = loading && spending.length === 0 && subscriptions.length === 0;

  return (
    <div className="finance">
      <header className="finance__header">
        <h1 className="finance__title">Personal Finance</h1>
        <nav className="finance__tabs">
          <button
            className={`tab-btn${tab === 'overview' ? ' tab-btn--active' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn${tab === 'spending' ? ' tab-btn--active' : ''}`}
            onClick={() => setTab('spending')}
          >
            Spending
          </button>
          <button
            className={`tab-btn${tab === 'subscriptions' ? ' tab-btn--active' : ''}`}
            onClick={() => setTab('subscriptions')}
          >
            Subscriptions
          </button>
        </nav>
      </header>

      {error && (
        <div className="api-error-banner">
          Couldn't reach the server: {error}. Make sure the API server is running.
        </div>
      )}

      <main className="finance__main">
        {isInitialLoad ? (
          <div className="loading-state">Loading...</div>
        ) : tab === 'overview' ? (
          <Overview onNavigate={setTab} />
        ) : tab === 'spending' ? (
          <SpendingView />
        ) : (
          <SubscriptionsView />
        )}
      </main>
    </div>
  );
}
