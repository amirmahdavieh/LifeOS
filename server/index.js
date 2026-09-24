import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RECURRING_HORIZON_WEEKS = 52;

const app = express();
app.use(cors());
app.use(express.json());

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    notes: row.notes ?? undefined,
    category: row.category ?? undefined,
    color: row.color ?? undefined,
    completed: !!row.completed,
    recurringId: row.recurringId ?? null,
  };
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

const insertTaskStmt = db.prepare(
  `INSERT INTO tasks (id, title, date, startTime, endTime, notes, category, color, completed, recurringId)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

function insertTask({ title, date, startTime, endTime, notes, category, color, completed, recurringId }) {
  const id = randomUUID();
  insertTaskStmt.run(
    id,
    title,
    date,
    startTime,
    endTime,
    notes ?? null,
    category ?? null,
    color ?? null,
    completed ? 1 : 0,
    recurringId ?? null
  );
  return id;
}

/** Tops up every recurring series so it has weekly occurrences out to the horizon. */
function refillRecurringSeries() {
  const groups = db
    .prepare('SELECT recurringId, MAX(date) as maxDate FROM tasks WHERE recurringId IS NOT NULL GROUP BY recurringId')
    .all();
  if (groups.length === 0) return;

  const horizonDate = addDays(new Date(), RECURRING_HORIZON_WEEKS * 7);

  for (const group of groups) {
    if (!group.maxDate) continue;
    const template = db
      .prepare('SELECT * FROM tasks WHERE recurringId = ? AND date = ? LIMIT 1')
      .get(group.recurringId, group.maxDate);
    if (!template) continue;

    let cursor = parseDateKey(group.maxDate);
    while (cursor < horizonDate) {
      cursor = addDays(cursor, 7);
      insertTask({
        title: template.title,
        date: formatDateKey(cursor),
        startTime: template.startTime,
        endTime: template.endTime,
        notes: template.notes,
        category: template.category,
        color: template.color,
        completed: false,
        recurringId: template.recurringId,
      });
    }
  }
}

app.get('/api/tasks', (req, res) => {
  refillRecurringSeries();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY date, startTime').all();
  res.json(rows.map(rowToTask));
});

app.post('/api/tasks', (req, res) => {
  const { title, date, startTime, endTime, notes, category, color, completed, repeatWeekly } = req.body ?? {};
  if (!title || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'title, date, startTime and endTime are required' });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  const recurringId = repeatWeekly ? randomUUID() : null;
  const firstId = insertTask({ title, date, startTime, endTime, notes, category, color, completed, recurringId });

  if (recurringId) {
    const startDate = parseDateKey(date);
    const horizonDate = addDays(new Date(), RECURRING_HORIZON_WEEKS * 7);
    let cursor = startDate;
    while (cursor < horizonDate) {
      cursor = addDays(cursor, 7);
      insertTask({
        title,
        date: formatDateKey(cursor),
        startTime,
        endTime,
        notes,
        category,
        color,
        completed: false,
        recurringId,
      });
    }
  }

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(firstId);
  res.status(201).json(rowToTask(row));
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const current = rowToTask(existing);
  const merged = { ...current, ...req.body };
  if (merged.endTime <= merged.startTime) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  db.prepare(
    `UPDATE tasks SET title=?, date=?, startTime=?, endTime=?, notes=?, category=?, color=?, completed=? WHERE id=?`
  ).run(
    merged.title,
    merged.date,
    merged.startTime,
    merged.endTime,
    merged.notes ?? null,
    merged.category ?? null,
    merged.color ?? null,
    merged.completed ? 1 : 0,
    id
  );
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(rowToTask(row));
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const scope = req.query.scope === 'future' ? 'future' : 'one';

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  if (scope === 'future' && existing.recurringId) {
    db.prepare('DELETE FROM tasks WHERE recurringId = ? AND date >= ?').run(existing.recurringId, existing.date);
  } else {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  }
  res.status(204).end();
});

function rowToSpending(row) {
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    category: row.category,
    merchant: row.merchant,
    notes: row.notes ?? undefined,
    paymentMethod: row.paymentMethod ?? undefined,
  };
}

function rowToSubscription(row) {
  return {
    id: row.id,
    name: row.name,
    monthlyPrice: row.monthlyPrice,
    billingDate: row.billingDate,
    category: row.category ?? undefined,
    notes: row.notes ?? undefined,
    active: !!row.active,
  };
}

const insertSpendingStmt = db.prepare(
  `INSERT INTO spending (id, amount, date, category, merchant, notes, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

app.get('/api/spending', (req, res) => {
  const rows = db.prepare('SELECT * FROM spending ORDER BY date DESC, rowid DESC').all();
  res.json(rows.map(rowToSpending));
});

app.post('/api/spending', (req, res) => {
  const { amount, date, category, merchant, notes, paymentMethod } = req.body ?? {};
  if (!amount || !date || !category || !merchant) {
    return res.status(400).json({ error: 'amount, date, category and merchant are required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const id = randomUUID();
  insertSpendingStmt.run(id, amount, date, category, merchant, notes ?? null, paymentMethod ?? null);
  const row = db.prepare('SELECT * FROM spending WHERE id = ?').get(id);
  res.status(201).json(rowToSpending(row));
});

app.put('/api/spending/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM spending WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Spending entry not found' });

  const current = rowToSpending(existing);
  const merged = { ...current, ...req.body };
  if (typeof merged.amount !== 'number' || merged.amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  db.prepare(`UPDATE spending SET amount=?, date=?, category=?, merchant=?, notes=?, paymentMethod=? WHERE id=?`).run(
    merged.amount,
    merged.date,
    merged.category,
    merged.merchant,
    merged.notes ?? null,
    merged.paymentMethod ?? null,
    id
  );
  const row = db.prepare('SELECT * FROM spending WHERE id = ?').get(id);
  res.json(rowToSpending(row));
});

app.delete('/api/spending/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM spending WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Spending entry not found' });
  db.prepare('DELETE FROM spending WHERE id = ?').run(id);
  res.status(204).end();
});

const insertSubscriptionStmt = db.prepare(
  `INSERT INTO subscriptions (id, name, monthlyPrice, billingDate, category, notes, active) VALUES (?, ?, ?, ?, ?, ?, ?)`
);

app.get('/api/subscriptions', (req, res) => {
  const rows = db.prepare('SELECT * FROM subscriptions ORDER BY name').all();
  res.json(rows.map(rowToSubscription));
});

app.post('/api/subscriptions', (req, res) => {
  const { name, monthlyPrice, billingDate, category, notes, active } = req.body ?? {};
  if (!name || monthlyPrice === undefined || billingDate === undefined) {
    return res.status(400).json({ error: 'name, monthlyPrice and billingDate are required' });
  }
  if (typeof monthlyPrice !== 'number' || monthlyPrice < 0) {
    return res.status(400).json({ error: 'monthlyPrice must be a non-negative number' });
  }
  if (!Number.isInteger(billingDate) || billingDate < 1 || billingDate > 31) {
    return res.status(400).json({ error: 'billingDate must be an integer between 1 and 31' });
  }
  const id = randomUUID();
  insertSubscriptionStmt.run(id, name, monthlyPrice, billingDate, category ?? null, notes ?? null, active === false ? 0 : 1);
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.status(201).json(rowToSubscription(row));
});

app.put('/api/subscriptions/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });

  const current = rowToSubscription(existing);
  const merged = { ...current, ...req.body };
  if (typeof merged.monthlyPrice !== 'number' || merged.monthlyPrice < 0) {
    return res.status(400).json({ error: 'monthlyPrice must be a non-negative number' });
  }
  if (!Number.isInteger(merged.billingDate) || merged.billingDate < 1 || merged.billingDate > 31) {
    return res.status(400).json({ error: 'billingDate must be an integer between 1 and 31' });
  }
  db.prepare(
    `UPDATE subscriptions SET name=?, monthlyPrice=?, billingDate=?, category=?, notes=?, active=? WHERE id=?`
  ).run(
    merged.name,
    merged.monthlyPrice,
    merged.billingDate,
    merged.category ?? null,
    merged.notes ?? null,
    merged.active ? 1 : 0,
    id
  );
  const row = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  res.json(rowToSubscription(row));
});

app.delete('/api/subscriptions/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });
  db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
  res.status(204).end();
});

// In production, also serve the built frontend from this same server/port.
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('/*splat', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

export function startServer(port = process.env.API_PORT || 3001) {
  return new Promise((resolve, reject) => {
    const server = app
      .listen(port, () => {
        console.log(`Weekly Planner API listening on http://localhost:${port}`);
        resolve({ server, port });
      })
      .on('error', reject);
  });
}

// Allow `node server/index.js` to keep working standalone (npm run dev:server / start).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  startServer();
}
