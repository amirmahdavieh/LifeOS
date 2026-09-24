import type { Task } from '../types';
import { timeToMinutes } from './date';

export interface PositionedTask {
  task: Task;
  col: number;
  colCount: number;
  startMin: number;
  endMin: number;
}

/**
 * Assigns overlapping tasks (within one day) to side-by-side columns so
 * none visually collide, using greedy interval-graph coloring per cluster.
 */
export function layoutDayTasks(tasks: Task[]): PositionedTask[] {
  const items = tasks
    .map((task) => {
      const startMin = timeToMinutes(task.startTime);
      let endMin = timeToMinutes(task.endTime);
      if (endMin <= startMin) endMin = startMin + 15; // guard against invalid ranges
      return { task, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const result: PositionedTask[] = [];
  let cluster: (typeof items) = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const assigned: { item: (typeof items)[number]; col: number }[] = [];
    for (const item of cluster) {
      let col = columnEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(item.endMin);
      } else {
        columnEnds[col] = item.endMin;
      }
      assigned.push({ item, col });
    }
    const colCount = columnEnds.length;
    for (const { item, col } of assigned) {
      result.push({ task: item.task, col, colCount, startMin: item.startMin, endMin: item.endMin });
    }
    cluster = [];
  };

  for (const item of items) {
    if (cluster.length > 0 && item.startMin >= clusterEnd) {
      flushCluster();
      clusterEnd = -Infinity;
    }
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.endMin);
  }
  flushCluster();

  return result;
}
