import { useRef } from 'react';
import type { Task } from '../types';
import { formatTimeLabel } from '../utils/date';
import { HOUR_HEIGHT, DEFAULT_COLOR } from '../constants';
import { useTaskStore } from '../store/useTaskStore';

interface TaskBlockProps {
  task: Task;
  startMin: number;
  endMin: number;
  col: number;
  colCount: number;
  onOpen: (task: Task) => void;
  onResizeStart?: (task: Task, edge: 'start' | 'end', e: React.PointerEvent) => void;
  onDragStart?: (task: Task, e: React.PointerEvent) => void;
}

export function TaskBlock({ task, startMin, endMin, col, colCount, onOpen, onResizeStart, onDragStart }: TaskBlockProps) {
  const toggleCompleted = useTaskStore((s) => s.toggleCompleted);
  const durationMin = Math.max(endMin - startMin, 1);
  const top = (startMin / 60) * HOUR_HEIGHT;
  const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 22);
  const color = task.color || DEFAULT_COLOR;
  const isShort = height < 40;
  const widthPct = 100 / colCount;
  const dragHandled = useRef(false);

  return (
    <div
      className={`task-block${task.completed ? ' task-block--completed' : ''}${isShort ? ' task-block--short' : ''}`}
      style={{
        top,
        height,
        left: `calc(${col * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeftColor: color,
        background: `${color}1a`,
      }}
      onClick={() => {
        if (dragHandled.current) {
          dragHandled.current = false;
          return;
        }
        onOpen(task);
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('.task-block__checkbox, .task-block__resize-handle')) return;
        dragHandled.current = false;
        onDragStart?.(task, e);
      }}
      title={`${task.title} (${formatTimeLabel(task.startTime)} – ${formatTimeLabel(task.endTime)})`}
      data-testid="task-block"
    >
      <label className="task-block__checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => toggleCompleted(task.id)}
          aria-label={`Mark "${task.title}" ${task.completed ? 'incomplete' : 'complete'}`}
        />
      </label>
      <div className="task-block__body">
        <div className="task-block__title">
          {task.recurringId && (
            <span className="task-block__repeat" title="Repeats weekly">
              {'↻'}
            </span>
          )}
          {task.title}
        </div>
        {!isShort && (
          <div className="task-block__time">
            {formatTimeLabel(task.startTime)}{'–'}{formatTimeLabel(task.endTime)}
          </div>
        )}
      </div>
      {task.category && !isShort && <span className="task-block__category">{task.category}</span>}
      {onResizeStart && (
        <div
          className="task-block__resize-handle"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(task, 'end', e);
          }}
        />
      )}
    </div>
  );
}
