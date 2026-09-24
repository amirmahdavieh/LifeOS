import { useState } from 'react';
import { PlannerView } from './planner/PlannerView';
import { FinanceApp } from './finance/FinanceApp';
import { useDailySpendingReminder } from './finance/useSpendingReminder';
import './App.css';

type LifeOSModule = 'planner' | 'finance';

function App() {
  useDailySpendingReminder();
  const [module, setModule] = useState<LifeOSModule>('planner');

  return (
    <div className="lifeos">
      <div className="lifeos-topbar">
        <span className="lifeos-topbar__brand">LifeOS</span>
        <nav className="lifeos-topbar__nav">
          <button
            className={`tab-btn${module === 'planner' ? ' tab-btn--active' : ''}`}
            onClick={() => setModule('planner')}
          >
            Planner
          </button>
          <button
            className={`tab-btn${module === 'finance' ? ' tab-btn--active' : ''}`}
            onClick={() => setModule('finance')}
          >
            Finance
          </button>
        </nav>
      </div>
      <div className="lifeos-body">{module === 'planner' ? <PlannerView /> : <FinanceApp />}</div>
    </div>
  );
}

export default App;
