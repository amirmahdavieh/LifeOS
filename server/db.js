import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Same on-disk location in every context (dev server, `electron .`, and the
// packaged app) so the app never opens a different, empty database.
function defaultDataDir() {
  const appName = 'weeklyplanner';
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  }
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), appName);
}

const dbPath = process.env.DB_PATH || path.join(defaultDataDir(), 'tasks.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    notes TEXT,
    category TEXT,
    color TEXT,
    completed INTEGER NOT NULL DEFAULT 0
  )
`);

const columns = db.prepare('PRAGMA table_info(tasks)').all();
if (!columns.some((c) => c.name === 'recurringId')) {
  db.exec('ALTER TABLE tasks ADD COLUMN recurringId TEXT');
}
