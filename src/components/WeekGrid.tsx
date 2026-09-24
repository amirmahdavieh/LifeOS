import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task, TaskDraft } from '../types';
import { formatDateKey, formatDayLabel, isToday, WEEKDAY_LABELS } from '../utils/date';
import { layoutDayTasks } from '../utils/layout';
import { TaskBlock } from './TaskBlock';
import { useTaskStore } from '../store/useTaskStore';
import { GRID_END_HOUR, GRID_START_HOUR, HOUR_HEIGHT, SNAP_MINUTES, DEFAULT_SCROLL_HOUR } from '../constants';

interface WeekGridProps {
  days: Date[];
  tasksByDate: Map<string, Task[]>;
  onOpenTask: (task: Task) => void;
  onCreateAt: (draft: Partial<TaskDraft>) => void;
}

type Interaction =
  | {
      type: 'move';
      taskId: string;
      durationMin: number;
      originDayIndex: number;
      originStartMin: number;
      pointerStartX: number;
      pointerStartY: number;
      previewDayIndex: number;
      previewStartMin: number;
      moved: boolean;
    }
  | {
      type: 'resize';
      taskId: string;
      dayIndex: number;
      startMin: number;
      originEndMin: number;
      pointerStartY: number;
      previewEndMin: number;
    };

function snap(minutes: number, step = SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

export function WeekGrid({ days, tasksByDate, onOpenTask, onCreateAt }: WeekGridProps) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const scrollRef = useRef<HTMLDivElement>(null);
  const daysContainerRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  interactionRef.current = interaction;
  const suppressClickRef = useRef(false);

  const handleOpenTask = useCallback(
    (task: Task) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      onOpenTask(task);
    },
    [onOpenTask]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = DEFAULT_SCROLL_HOUR * HOUR_HEIGHT;
    }
  }, []);

  const hours = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);

  const handleDragStart = useCallback(
    (task: Task, e: React.PointerEvent, dayIndex: number, startMin: number, durationMin: number) => {
      e.preventDefault();
      setInteraction({
        type: 'move',
        taskId: task.id,
        durationMin,
        originDayIndex: dayIndex,
        originStartMin: startMin,
        pointerStartX: e.clientX,
        pointerStartY: e.clientY,
        previewDayIndex: dayIndex,
        previewStartMin: startMin,
        moved: false,
      });
    },
    []
  );

  const handleResizeStart = useCallback(
    (task: Task, e: React.PointerEvent, dayIndex: number, startMin: number, endMin: number) => {
      e.preventDefault();
      setInteraction({
        type: 'resize',
        taskId: task.id,
        dayIndex,
        startMin,
        originEndMin: endMin,
        pointerStartY: e.clientY,
        previewEndMin: endMin,
      });
    },
    []
  );

  useEffect(() => {
    if (!interaction) return;

    function onPointerMove(e: PointerEvent) {
      const current = interactionRef.current;
      if (!current || !daysContainerRef.current) return;
      const rect = daysContainerRef.current.getBoundingClientRect();
      const colWidth = rect.width / 7;

      if (current.type === 'move') {
        const deltaY = e.clientY - current.pointerStartY;
        const deltaX = e.clientX - current.pointerStartX;
        if (Math.abs(deltaY) > 3 || Math.abs(deltaX) > 3) current.moved = true;
        const deltaMin = snap((deltaY / HOUR_HEIGHT) * 60);
        const deltaDays = Math.round(deltaX / colWidth);
        const maxStart = GRID_END_HOUR * 60 - current.durationMin;
        const previewStartMin = Math.max(0, Math.min(maxStart, current.originStartMin + deltaMin));
        const previewDayIndex = Math.max(0, Math.min(6, current.originDayIndex + deltaDays));
        setInteraction({ ...current, previewStartMin, previewDayIndex });
      } else {
        const deltaY = e.clientY - current.pointerStartY;
        const deltaMin = snap((deltaY / HOUR_HEIGHT) * 60);
        const minEnd = current.startMin + SNAP_MINUTES;
        const previewEndMin = Math.max(minEnd, Math.min(GRID_END_HOUR * 60, current.originEndMin + deltaMin));
        setInteraction({ ...current, previewEndMin });
      }
    }

    function onPointerUp() {
      const current = interactionRef.current;
      if (current) {
        if (current.type === 'move') {
          if (current.moved) {
            const newDate = formatDateKey(days[current.previewDayIndex]);
            const startTime = minutesToTimeStr(current.previewStartMin);
            const endTime = minutesToTimeStr(current.previewStartMin + current.durationMin);
            updateTask(current.taskId, { date: newDate, startTime, endTime });
            suppressClickRef.current = true;
          }
        } else {
          const endTime = minutesToTimeStr(current.previewEndMin);
          updateTask(current.taskId, { endTime });
          suppressClickRef.current = true;
        }
      }
      setInteraction(null);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [interaction !== null, days, updateTask]);

  function handleSlotClick(dayIndex: number, e: React.MouseEvent<HTMLDivElement>) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if ((e.target as HTMLElement).closest('.task-block')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutes = snap((offsetY / HOUR_HEIGHT) * 60, 30);
    const startMin = Math.max(0, Math.min(GRID_END_HOUR * 60 - 60, minutes));
    onCreateAt({
      date: formatDateKey(days[dayIndex]),
      startTime: minutesToTimeStr(startMin),
      endTime: minutesToTimeStr(Math.min(GRID_END_HOUR * 60, startMin + 60)),
    });
  }

  return (
    <div className="week-grid">
      <div className="week-grid__header">
        <div className="week-grid__gutter-spacer" />
        {days.map((day, i) => (
          <div key={i} className={`week-grid__day-header${isToday(day) ? ' week-grid__day-header--today' : ''}`}>
            <span className="week-grid__day-name">{WEEKDAY_LABELS[i]}</span>
            <span className="week-grid__day-date">{formatDayLabel(day)}</span>
          </div>
        ))}
      </div>
      <div className="week-grid__body" ref={scrollRef}>
        <div className="week-grid__gutter">
          {hours.map((h) => (
            <div key={h} className="hour-label" style={{ height: HOUR_HEIGHT }}>
              {formatHourLabel(h)}
            </div>
          ))}
        </div>
        <div className="week-grid__days" ref={daysContainerRef}>
          {days.map((day, dayIndex) => {
            const dateKey = formatDateKey(day);
            const dayTasks = (tasksByDate.get(dateKey) ?? []).filter((t) => {
              return !(interaction?.type === 'move' && interaction.moved && interaction.taskId === t.id);
            });
            const positioned = layoutDayTasks(dayTasks);
            return (
              <div
                key={dateKey}
                className={`week-grid__day-col${isToday(day) ? ' week-grid__day-col--today' : ''}`}
                style={{ height: (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT }}
                onClick={(e) => handleSlotClick(dayIndex, e)}
              >
                {hours.map((h) => (
                  <div key={h} className="hour-line" style={{ top: h * HOUR_HEIGHT }} />
                ))}
                {positioned.map(({ task, col, colCount, startMin, endMin }) => {
                  const isResizing = interaction?.type === 'resize' && interaction.taskId === task.id;
                  const effectiveEnd = isResizing ? (interaction as Interaction & { type: 'resize' }).previewEndMin : endMin;
                  return (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      startMin={startMin}
                      endMin={effectiveEnd}
                      col={col}
                      colCount={colCount}
                      onOpen={handleOpenTask}
                      onDragStart={(t, e) => handleDragStart(t, e, dayIndex, startMin, endMin - startMin)}
                      onResizeStart={(t, _edge, e) => handleResizeStart(t, e, dayIndex, startMin, endMin)}
                    />
                  );
                })}
              </div>
            );
          })}
          {interaction?.type === 'move' && interaction.moved && (
            <MoveGhost interaction={interaction} tasksByDate={tasksByDate} days={days} />
          )}
        </div>
      </div>
    </div>
  );
}

function MoveGhost({
  interaction,
  tasksByDate,
  days,
}: {
  interaction: Extract<Interaction, { type: 'move' }>;
  tasksByDate: Map<string, Task[]>;
  days: Date[];
}) {
  const originDateKey = formatDateKey(days[interaction.originDayIndex]);
  const task = tasksByDate.get(originDateKey)?.find((t) => t.id === interaction.taskId);
  if (!task) return null;
  const top = (interaction.previewStartMin / 60) * HOUR_HEIGHT;
  const height = Math.max((interaction.durationMin / 60) * HOUR_HEIGHT, 22);
  const widthPct = 100 / 7;
  return (
    <div
      className="task-block task-block--ghost"
      style={{
        top,
        height,
        left: `calc(${interaction.previewDayIndex * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeftColor: task.color || undefined,
      }}
    >
      <div className="task-block__body">
        <div className="task-block__title">{task.title}</div>
        <div className="task-block__time">
          {minutesToTimeStr(interaction.previewStartMin)} {'–'} {minutesToTimeStr(interaction.previewStartMin + interaction.durationMin)}
        </div>
      </div>
    </div>
  );
}

function minutesToTimeStr(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatHourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
