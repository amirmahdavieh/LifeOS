import { useMemo, useState } from 'react';
import type { Task } from '../types';
import { formatDateKey, formatDayLabel, WEEKDAY_LABELS } from '../utils/date';
import { useTaskStore } from '../store/useTaskStore';

interface WeeklyReviewProps {
  days: Date[];
  tasksByDate: Map<string, Task[]>;
}

export function WeeklyReview({ days, tasksByDate }: WeeklyReviewProps) {
  const moveTasksByDays = useTaskStore((s) => s.moveTasksByDays);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allTasks = useMemo(() => days.flatMap((d) => tasksByDate.get(formatDateKey(d)) ?? []), [days, tasksByDate]);
  const total = allTasks.length;
  const completed = allTasks.filter((t) => t.completed).length;
  const incomplete = total - completed;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

  const incompleteTasks = useMemo(
    () =>
      days.flatMap((d) => {
        const key = formatDateKey(d);
        return (tasksByDate.get(key) ?? [])
          .filter((t) => !t.completed)
          .map((t) => ({ task: t, day: d }));
      }),
    [days, tasksByDate]
  );

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(incompleteTasks.map(({ task }) => task.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function moveSelected() {
    if (selected.size === 0) return;
    moveTasksByDays(Array.from(selected), 7);
    setSelected(new Set());
  }

  return (
    <div className="review">
      <div className="review__summary-cards">
        <div className="summary-card">
          <div className="summary-card__value">{total}</div>
          <div className="summary-card__label">Total Tasks</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{completed}</div>
          <div className="summary-card__label">Completed</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{incomplete}</div>
          <div className="summary-card__label">Incomplete</div>
        </div>
        <div className="summary-card">
          <div className="summary-card__value">{pct}%</div>
          <div className="summary-card__label">Completion Rate</div>
        </div>
      </div>

      <section className="review__section">
        <h3>Completion by Day</h3>
        <div className="day-breakdown">
          {days.map((day, i) => {
            const key = formatDateKey(day);
            const dayTasks = tasksByDate.get(key) ?? [];
            const dayCompleted = dayTasks.filter((t) => t.completed).length;
            const dayPct = dayTasks.length === 0 ? 0 : Math.round((dayCompleted / dayTasks.length) * 100);
            return (
              <div className="day-breakdown__row" key={key}>
                <div className="day-breakdown__label">
                  <span>{WEEKDAY_LABELS[i]}</span>
                  <span className="day-breakdown__date">{formatDayLabel(day)}</span>
                </div>
                <div className="progress-bar progress-bar--small">
                  <div className="progress-bar__fill" style={{ width: `${dayPct}%` }} />
                </div>
                <div className="day-breakdown__pct">
                  {dayTasks.length === 0 ? '—' : `${dayPct}%`}
                </div>
                <div className="day-breakdown__count">
                  {dayCompleted}/{dayTasks.length}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="review__section">
        <div className="review__section-header">
          <h3>Unfinished Tasks</h3>
          {incompleteTasks.length > 0 && (
            <div className="review__section-actions">
              <button className="btn btn--ghost btn--small" onClick={selectAll}>
                Select all
              </button>
              <button className="btn btn--ghost btn--small" onClick={clearSelection}>
                Clear
              </button>
              <button
                className="btn btn--primary btn--small"
                onClick={moveSelected}
                disabled={selected.size === 0}
              >
                Move {selected.size > 0 ? `${selected.size} ` : ''}to next week
              </button>
            </div>
          )}
        </div>
        {incompleteTasks.length === 0 ? (
          <p className="review__empty">Nothing unfinished this week. Nice work.</p>
        ) : (
          <ul className="unfinished-list">
            {incompleteTasks.map(({ task, day }) => (
              <li key={task.id} className="unfinished-list__item">
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={() => toggleSelected(task.id)}
                  />
                  <span
                    className="unfinished-list__color"
                    style={{ background: task.color || '#8B8B8B' }}
                  />
                  <span className="unfinished-list__title">{task.title}</span>
                  <span className="unfinished-list__meta">
                    {WEEKDAY_LABELS[days.indexOf(day)]} {'·'} {task.startTime}{'–'}{task.endTime}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
