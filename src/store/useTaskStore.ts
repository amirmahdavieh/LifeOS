import { create } from 'zustand';
import type { DeleteScope, Task, TaskDraft } from '../types';

const API_BASE = '/api/tasks';

interface TaskStore {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  loadTasks: () => Promise<void>;
  addTask: (draft: TaskDraft) => Promise<void>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => Promise<void>;
  deleteTask: (id: string, scope?: DeleteScope) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
  moveTasksByDays: (ids: string[], days: number) => Promise<void>;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export const useTaskStore = create<TaskStore>()((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  loadTasks: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to load tasks'));
      const tasks: Task[] = await res.json();
      set({ tasks, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  addTask: async (draft) => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const message = await parseErrorMessage(res, 'Failed to create task');
      set({ error: message });
      throw new Error(message);
    }
    const task: Task = await res.json();
    if (task.recurringId) {
      // A weekly series was generated server-side; refetch to pick up every occurrence.
      await get().loadTasks();
    } else {
      set((state) => ({ tasks: [...state.tasks, task], error: null }));
    }
  },

  updateTask: async (id, updates) => {
    const previous = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res, 'Failed to update task'));
      const task: Task = await res.json();
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? task : t)), error: null }));
    } catch (e) {
      set({ tasks: previous, error: (e as Error).message });
      throw e;
    }
  },

  deleteTask: async (id, scope = 'one') => {
    const target = get().tasks.find((t) => t.id === id);
    const previous = get().tasks;
    if (scope === 'future' && target?.recurringId) {
      set((state) => ({
        tasks: state.tasks.filter((t) => !(t.recurringId === target.recurringId && t.date >= target.date)),
      }));
    } else {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
    try {
      const res = await fetch(`${API_BASE}/${id}?scope=${scope}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(await parseErrorMessage(res, 'Failed to delete task'));
      }
    } catch (e) {
      set({ tasks: previous, error: (e as Error).message });
      throw e;
    }
  },

  toggleCompleted: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    await get().updateTask(id, { completed: !task.completed });
  },

  moveTasksByDays: async (ids, days) => {
    const tasks = get().tasks;
    const targets = ids
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is Task => Boolean(t))
      .map((t) => {
        const [y, m, d] = t.date.split('-').map(Number);
        const newDate = new Date(y, m - 1, d + days);
        const date = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
        return { id: t.id, date };
      });
    await Promise.all(targets.map(({ id, date }) => get().updateTask(id, { date })));
  },
}));
