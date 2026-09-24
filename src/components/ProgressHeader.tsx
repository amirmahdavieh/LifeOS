import { formatWeekRangeLabel } from '../utils/date';

interface ProgressHeaderProps {
  weekStart: Date;
  completed: number;
  total: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  view: 'planner' | 'review';
  onViewChange: (view: 'planner' | 'review') => void;
  onAddTask: () => void;
}

export function ProgressHeader({
  weekStart,
  completed,
  total,
  onPrevWeek,
  onNextWeek,
  onToday,
  view,
  onViewChange,
  onAddTask,
}: ProgressHeaderProps) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <header className="app-header">
      <div className="app-header__top">
        <h1 className="app-header__title">Weekly Planner</h1>
        <div className="app-header__tabs">
          <button
            className={`tab-btn${view === 'planner' ? ' tab-btn--active' : ''}`}
            onClick={() => onViewChange('planner')}
          >
            Planner
          </button>
          <button
            className={`tab-btn${view === 'review' ? ' tab-btn--active' : ''}`}
            onClick={() => onViewChange('review')}
          >
            Review
          </button>
        </div>
        <button className="btn btn--primary" onClick={onAddTask}>
          + Add Task
        </button>
      </div>

      <div className="app-header__progress">
        <div className="progress-label">
          <span className="progress-label__title">Weekly Progress</span>
          <span className="progress-label__pct">{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label__count">
          {completed} / {total} tasks completed
        </div>
      </div>

      <div className="app-header__nav">
        <button className="btn btn--ghost" onClick={onPrevWeek}>
          {'←'} Previous Week
        </button>
        <button className="btn btn--ghost" onClick={onToday}>
          Today
        </button>
        <button className="btn btn--ghost" onClick={onNextWeek}>
          Next Week {'→'}
        </button>
        <span className="app-header__range">{formatWeekRangeLabel(weekStart)}</span>
      </div>
    </header>
  );
}
