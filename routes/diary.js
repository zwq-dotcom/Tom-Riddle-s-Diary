const express = require('express');
const db = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '请先登录' });
  }
  next();
}

router.get('/list', requireAuth, (req, res) => {
  const diaries = db.prepare(
    'SELECT id, content, ai_reply, mode, created_at FROM diaries WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.session.userId);
  res.json(diaries);
});

router.get('/:id', requireAuth, (req, res) => {
  const diary = db.prepare(
    'SELECT id, content, ai_reply, mode, created_at FROM diaries WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.session.userId);
  if (!diary) {
    return res.status(404).json({ error: '日记不存在' });
  }
  res.json(diary);
});

router.post('/save', requireAuth, (req, res) => {
  const { content, ai_reply, mode, messages } = req.body;
  const result = db.prepare(
    'INSERT INTO diaries (user_id, content, ai_reply, mode) VALUES (?, ?, ?, ?)'
  ).run(req.session.userId, content || '', ai_reply || null, mode || 'ai_off');
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/:id', requireAuth, (req, res) => {
  const { content, ai_reply, mode } = req.body;
  const result = db.prepare(
    'UPDATE diaries SET content = ?, ai_reply = ?, mode = ? WHERE id = ? AND user_id = ?'
  ).run(content || '', ai_reply || null, mode || 'ai_off', req.params.id, req.session.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: '日记不存在' });
  }
  res.json({ success: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  const result = db.prepare('DELETE FROM diaries WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: '日记不存在' });
  }
  res.json({ success: true });
});

module.exports = router;
