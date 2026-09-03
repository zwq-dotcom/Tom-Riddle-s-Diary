const path = require('path');

let db;

if (process.env.VERCEL) {
  const store = { users: [], diaries: [], nextUserId: 1, nextDiaryId: 1 };

  db = {
    prepare(sql) {
      const self = this;
      return {
        get(...params) {
          if (sql.includes('FROM users WHERE username = ?')) {
            return store.users.find(u => u.username === params[0]) || undefined;
          }
          if (sql.includes('FROM users WHERE id = ?')) {
            return store.users.find(u => u.id === params[0]) || undefined;
          }
          if (sql.includes('FROM diaries WHERE id = ? AND user_id = ?')) {
            return store.diaries.find(d => d.id == params[0] && d.user_id == params[1]) || undefined;
          }
          if (sql.includes('FROM diaries WHERE user_id = ?')) {
            return store.diaries.filter(d => d.user_id == params[0]);
          }
          return undefined;
        },
        all(...params) {
          if (sql.includes('FROM diaries WHERE user_id = ?')) {
            return store.diaries.filter(d => d.user_id == params[0]);
          }
          return [];
        },
        run(...params) {
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
            const d = store.diaries.find(d => d.id == params[3] && d.user_id == params[4]);
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
    },
    exec() {},
    pragma() {}
  };
} else {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'diary.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
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
}

module.exports = db;
