import { useEffect, useState } from 'react';
import type { DeleteScope, TaskDraft } from '../types';
import { COLOR_PALETTE, DEFAULT_COLOR } from '../constants';
import { formatDateKey } from '../utils/date';

interface TaskModalProps {
  mode: 'create' | 'edit';
  initial: TaskDraft;
  onSave: (draft: TaskDraft) => void;
  onDelete?: (scope: DeleteScope) => void;
  onClose: () => void;
}

interface FormState {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  category: string;
  color: string;
  completed: boolean;
  repeatWeekly: boolean;
}

function toFormState(draft: TaskDraft): FormState {
  return {
    title: draft.title ?? '',
    date: draft.date ?? formatDateKey(new Date()),
    startTime: draft.startTime ?? '09:00',
    endTime: draft.endTime ?? '10:00',
    notes: draft.notes ?? '',
    category: draft.category ?? '',
    color: draft.color ?? DEFAULT_COLOR,
    completed: draft.completed ?? false,
    repeatWeekly: draft.repeatWeekly ?? false,
  };
}

export function TaskModal({ mode, initial, onSave, onDelete, onClose }: TaskModalProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isRecurringOccurrence = mode === 'edit' && Boolean(initial.recurringId);

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
    const title = form.title.trim();
    if (!title) {
      setError('Title is required.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('End time must be after start time.');
      return;
    }
    setError(null);
    onSave({
      id: initial.id,
      title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      notes: form.notes.trim() || undefined,
      category: form.category.trim() || undefined,
      color: form.color,
      completed: form.completed,
      repeatWeekly: form.repeatWeekly,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>{mode === 'create' ? 'New Task' : 'Task Details'}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            {'×'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal__form">
          <label className="field">
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
              autoFocus
              maxLength={200}
            />
          </label>

          {isRecurringOccurrence && (
            <div className="recurring-note">{'↻'} Part of a weekly series &mdash; this occurrence only</div>
          )}

          <div className="field-row">
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Start time</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>End time</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span>Category (optional)</span>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="e.g. Work, Study, Health"
              maxLength={40}
            />
          </label>

          <div className="field">
            <span>Color (optional)</span>
            <div className="color-swatches">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-swatch${form.color === c ? ' color-swatch--selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  aria-label={`Choose color ${c}`}
                />
              ))}
            </div>
          </div>

          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Add any details..."
              rows={4}
              maxLength={2000}
            />
          </label>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.completed}
              onChange={(e) => setForm((f) => ({ ...f, completed: e.target.checked }))}
            />
            <span>Completed</span>
          </label>

          {mode === 'create' && (
            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={form.repeatWeekly}
                onChange={(e) => setForm((f) => ({ ...f, repeatWeekly: e.target.checked }))}
              />
              <span>Repeat every week (same day &amp; time)</span>
            </label>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal__actions">
            {mode === 'edit' && onDelete && !confirmingDelete && (
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => (isRecurringOccurrence ? setConfirmingDelete(true) : onDelete('one'))}
              >
                Delete
              </button>
            )}
            {mode === 'edit' && onDelete && confirmingDelete && (
              <div className="delete-scope-choice">
                <span>Delete:</span>
                <button type="button" className="btn btn--danger btn--small" onClick={() => onDelete('one')}>
                  Just this week
                </button>
                <button type="button" className="btn btn--danger btn--small" onClick={() => onDelete('future')}>
                  This &amp; future weeks
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Back
                </button>
              </div>
            )}
            {!confirmingDelete && (
              <div className="modal__actions-right">
                <button type="button" className="btn btn--ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  {mode === 'create' ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
