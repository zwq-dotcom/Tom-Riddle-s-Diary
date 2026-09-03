const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database', 'diary.db');
let db;

function initDatabase() {
  db = new Database(dbPath);
  
  db.pragma('journal_mode = WAL');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS diaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      ai_reply TEXT,
      ai_mode INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Database initialized');
}

function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

function createUser(username, password) {
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword);
  return result.lastInsertRowid;
}

function verifyUser(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  if (bcrypt.compareSync(password, user.password)) {
    return user;
  }
  return null;
}

function saveDiary(userId, content, aiReply, aiMode) {
  const result = db.prepare(
    'INSERT INTO diaries (user_id, content, ai_reply, ai_mode) VALUES (?, ?, ?, ?)'
  ).run(userId, content, aiReply, aiMode ? 1 : 0);
  return result.lastInsertRowid;
}

function getDiariesByUserId(userId) {
  return db.prepare(
    'SELECT * FROM diaries WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

function getDiaryById(id, userId) {
  return db.prepare(
    'SELECT * FROM diaries WHERE id = ? AND user_id = ?'
  ).get(id, userId);
}

function deleteDiary(id, userId) {
  return db.prepare(
    'DELETE FROM diaries WHERE id = ? AND user_id = ?'
  ).run(id, userId);
}

module.exports = {
  initDatabase,
  getUserByUsername,
  createUser,
  verifyUser,
  saveDiary,
  getDiariesByUserId,
  getDiaryById,
  deleteDiary
};
