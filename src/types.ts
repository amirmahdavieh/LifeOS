export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  notes?: string;
  category?: string;
  color?: string; // hex color
  completed: boolean;
  recurringId?: string | null;
}

export type TaskDraft = Omit<Task, 'id' | 'completed'> & {
  id?: string;
  completed?: boolean;
  /** Create-time only: generate this task on the same day/time every week. */
  repeatWeekly?: boolean;
};

export type DeleteScope = 'one' | 'future';
