import { useEffect, useMemo, useState } from 'react';
import { ProgressHeader } from './components/ProgressHeader';
import { WeekGrid } from './components/WeekGrid';
import { WeeklyReview } from './components/WeeklyReview';
import { TaskModal } from './components/TaskModal';
import { useTaskStore } from './store/useTaskStore';
import type { DeleteScope, Task, TaskDraft } from './types';
import { addWeeks, formatDateKey, getWeekDays, getWeekStart } from './utils/date';
import './App.css';

type ModalState = { mode: 'create' | 'edit'; draft: TaskDraft } | null;

function App() {
  const tasks = useTaskStore((s) => s.tasks);
  const loading = useTaskStore((s) => s.loading);
  const error = useTaskStore((s) => s.error);
  const loadTasks = useTaskStore((s) => s.loadTasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [view, setView] = useState<'planner' | 'review'>('planner');
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.date);
      if (list) list.push(t);
      else map.set(t.date, [t]);
    }
    return map;
  }, [tasks]);

  const weekTasks = useMemo(
    () => days.flatMap((d) => tasksByDate.get(formatDateKey(d)) ?? []),
    [days, tasksByDate]
  );
  const completedCount = weekTasks.filter((t) => t.completed).length;

  function openCreateModal(prefill?: Partial<TaskDraft>) {
    setModal({
      mode: 'create',
      draft: {
        title: '',
        date: prefill?.date ?? formatDateKey(new Date()),
        startTime: prefill?.startTime ?? '09:00',
        endTime: prefill?.endTime ?? '10:00',
        notes: '',
        category: '',
        color: undefined,
        completed: false,
      },
    });
  }

  function openEditModal(task: Task) {
    setModal({ mode: 'edit', draft: task });
  }

  function handleSave(draft: TaskDraft) {
    const request =
      modal?.mode === 'edit' && draft.id
        ? updateTask(draft.id, {
            title: draft.title,
            date: draft.date,
            startTime: draft.startTime,
            endTime: draft.endTime,
            notes: draft.notes,
            category: draft.category,
            color: draft.color,
            completed: draft.completed ?? false,
          })
        : addTask(draft);
    request.catch(() => {});
    setModal(null);
  }

  function handleDelete(scope: DeleteScope) {
    if (modal?.mode === 'edit' && modal.draft.id) {
      deleteTask(modal.draft.id, scope).catch(() => {});
    }
    setModal(null);
  }

  return (
    <div className="app">
      <ProgressHeader
        weekStart={weekStart}
        completed={completedCount}
        total={weekTasks.length}
        onPrevWeek={() => setWeekStart((w) => addWeeks(w, -1))}
        onNextWeek={() => setWeekStart((w) => addWeeks(w, 1))}
        onToday={() => setWeekStart(getWeekStart(new Date()))}
        view={view}
        onViewChange={setView}
        onAddTask={() => openCreateModal()}
      />

      {error && (
        <div className="api-error-banner">
          Couldn't reach the server: {error}. Make sure the API server is running.
        </div>
      )}

      <main className="app__main">
        {loading && tasks.length === 0 ? (
          <div className="loading-state">Loading tasks...</div>
        ) : view === 'planner' ? (
          <WeekGrid
            days={days}
            tasksByDate={tasksByDate}
            onOpenTask={openEditModal}
            onCreateAt={(prefill) => openCreateModal(prefill)}
          />
        ) : (
          <WeeklyReview days={days} tasksByDate={tasksByDate} />
        )}
      </main>

      {modal && (
        <TaskModal
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

export default App;
