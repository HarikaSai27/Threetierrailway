const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. On Railway, add it as a reference to your Postgres service.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set DATABASE_SSL=true if you connect through Railway's public (proxy) Postgres URL.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (title.length > 200) return res.status(400).json({ error: 'Title too long' });
  try {
    const { rows } = await pool.query('INSERT INTO tasks (title) VALUES ($1) RETURNING *', [title]);
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING *', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Create the table (and seed once) on startup, retrying while the DB comes up.
async function initDb(retries = 30) {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query(schema);
      const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM tasks');
      if (rows[0].n === 0) {
        await pool.query(
          `INSERT INTO tasks (title, done) VALUES
             ('Deployed on Railway', TRUE),
             ('Add a new task from the UI', FALSE)`);
      }
      console.log('Database ready');
      return;
    } catch (e) {
      console.log(`Database not ready (${i}/${retries}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error('Could not connect to the database');
}

// No host argument: listens on all interfaces (IPv4 + IPv6), needed for Railway private networking.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API listening on :${port}`));

initDb().catch((e) => {
  console.error(e);
  process.exit(1);
});
