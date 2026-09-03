const express = require('express');
const router = express.Router();
const db = require('../database/db');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please login first' });
  }
  next();
}

router.get('/', requireAuth, (req, res) => {
  try {
    const diaries = db.getDiariesByUserId(req.session.userId);
    res.json({ success: true, diaries });
  } catch (error) {
    console.error('Get diaries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, (req, res) => {
  try {
    const diary = db.getDiaryById(parseInt(req.params.id), req.session.userId);
    if (!diary) {
      return res.status(404).json({ error: 'Diary not found' });
    }
    res.json({ success: true, diary });
  } catch (error) {
    console.error('Get diary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, (req, res) => {
  try {
    const { content, aiReply, aiMode } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const diaryId = db.saveDiary(req.session.userId, content, aiReply || null, aiMode);
    
    res.json({ 
      success: true, 
      message: 'Diary saved',
      diaryId
    });
  } catch (error) {
    console.error('Save diary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = db.deleteDiary(parseInt(req.params.id), req.session.userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Diary not found' });
    }
    res.json({ success: true, message: 'Diary deleted' });
  } catch (error) {
    console.error('Delete diary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
