const path = require('path');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS diaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  ai_reply TEXT DEFAULT NULL,
  mode TEXT DEFAULT 'ai_off',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

let db;

if (process.env.TURSO_DATABASE_URL) {
  // ===== Mode 0: Turso cloud SQLite (persistent, free) =====
  const { createClient } = require('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  function rowsToObjects(result) {
    return result.rows.map(row => {
      const o = {};
      for (const col of result.columns) o[col] = row[col];
      return o;
    });
  }

  db = {
    prepare(sql) {
      return {
        async get(...params) {
          const r = await client.execute({ sql, args: params });
          const rows = rowsToObjects(r);
          return rows[0] || undefined;
        },
        async all(...params) {
          const r = await client.execute({ sql, args: params });
          return rowsToObjects(r);
        },
        async run(...params) {
          const r = await client.execute({ sql, args: params });
          return {
            lastInsertRowid: Number(r.lastInsertRowid || 0),
            changes: r.rowsAffected || 0
          };
        }
      };
    },
    async init() {
      const statements = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS diaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          ai_reply TEXT DEFAULT NULL,
          mode TEXT DEFAULT 'ai_off',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `.split(';').map(s => s.trim()).filter(Boolean);
      for (const sql of statements) {
        await client.execute(sql);
      }
    }
  };
} else if (process.env.DATABASE_URL) {
  // ===== Mode 1: Neon/Postgres cloud database (persistent, free) =====
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false }
  });

  function toPg(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => '$' + (++i));
  }

  db = {
    prepare(sql) {
      const pgSql = toPg(sql);
      const isInsert = /^\s*INSERT/i.test(sql);
      return {
        async get(...params) {
          const r = await pool.query(pgSql, params);
          return r.rows[0] || undefined;
        },
        async all(...params) {
          const r = await pool.query(pgSql, params);
          return r.rows;
        },
        async run(...params) {
          if (isInsert) {
            const r = await pool.query(pgSql + ' RETURNING id', params);
            return { lastInsertRowid: r.rows[0] ? r.rows[0].id : 0, changes: r.rowCount };
          }
          const r = await pool.query(pgSql, params);
          return { lastInsertRowid: 0, changes: r.rowCount };
        }
      };
    },
    async init() {
      const statements = SCHEMA.split(';').map(s => s.trim()).filter(Boolean);
      for (const sql of statements) {
        await pool.query(sql);
      }
    }
  };
} else if (process.env.VERCEL) {
  // ===== Mode 2: in-memory (fallback when no cloud DB on serverless) =====
  const store = { users: [], diaries: [], nextUserId: 1, nextDiaryId: 1 };

  db = {
    prepare(sql) {
      return {
        async get(...params) {
          if (sql.includes('FROM users WHERE username = ?')) {
            return store.users.find(u => u.username === params[0]) || undefined;
          }
          if (sql.includes('FROM users WHERE id = ?')) {
            return store.users.find(u => u.id == params[0]) || undefined;
          }
          if (sql.includes('FROM diaries WHERE id = ? AND user_id = ?')) {
            return store.diaries.find(d => d.id == params[0] && d.user_id == params[1]) || undefined;
          }
          return undefined;
        },
        async all(...params) {
          if (sql.includes('FROM diaries WHERE user_id = ?')) {
            return store.diaries.filter(d => d.user_id == params[0]);
          }
          return [];
        },
        async run(...params) {
          if (sql.includes('INSERT INTO users')) {
            const user = { id: store.nextUserId++, username: params[0], password: params[1], created_at: new Date().toISOString() };
            store.users.push(user);
            return { lastInsertRowid: user.id, changes: 1 };
          }
          if (sql.includes('INSERT INTO diaries')) {
            const diary = { id: store.nextDiaryId++, user_id: params[0], content: params[1], ai_reply: params[2], mode: params[3], created_at: new Date().toISOString() };
            store.diaries.push(diary);
            return { lastInsertRowid: diary.id, changes: 1 };
          }
          if (sql.includes('UPDATE diaries')) {
            const d = store.diaries.find(x => x.id == params[3] && x.user_id == params[4]);
            if (d) { d.content = params[0]; d.ai_reply = params[1]; d.mode = params[2]; return { changes: 1 }; }
            return { changes: 0 };
          }
          if (sql.includes('DELETE FROM diaries')) {
            const idx = store.diaries.findIndex(d => d.id == params[0] && d.user_id == params[1]);
            if (idx >= 0) { store.diaries.splice(idx, 1); return { changes: 1 }; }
            return { changes: 0 };
          }
          return { changes: 0 };
        }
      };
    }
  };
} else {
  // ===== Mode 3: local SQLite (development) =====
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'diary.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS diaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      ai_reply TEXT DEFAULT NULL,
      mode TEXT DEFAULT 'ai_off',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db = {
    prepare(sql) {
      const stmt = sqlite.prepare(sql);
      return {
        get(...params) { return Promise.resolve(stmt.get(...params)); },
        all(...params) { return Promise.resolve(stmt.all(...params)); },
        run(...params) { return Promise.resolve(stmt.run(...params)); }
      };
    }
  };
}

module.exports = db;
