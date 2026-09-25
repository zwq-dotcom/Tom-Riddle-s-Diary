require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { sessionMiddleware } = require('./session');

const authRoutes = require('./routes/auth');
const diaryRoutes = require('./routes/diary');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/ai', aiRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

Promise.resolve(db.init ? db.init() : null)
  .catch(err => console.error('DB init error:', err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Tom Riddle's Diary server running on http://localhost:${PORT}`);
    });
  });
