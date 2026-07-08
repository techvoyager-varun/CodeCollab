const express = require('express');
const ReviewComment = require('../models/ReviewComment');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const { fileId, lineNumber, comment } = req.body;
    if (!fileId || lineNumber === undefined || !comment) {
      return res.status(400).json({ error: 'File ID, line number, and comment are required.' });
    }

    const review = await ReviewComment.create(
      fileId,
      lineNumber,
      comment,
      req.user.id,
      req.user.username
    );

    // Emit live socket event if io is bound to app
    const io = req.app.get('io');
    if (io) {
      // Find room/project connection? Simple broadcast or direct event on fileId room
      io.emit(`file-comment-add:${fileId}`, review);
    }

    res.status(201).json({ review });
  } catch (err) {
    console.error('[REVIEWS] Create error:', err.message);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// GET /api/reviews/:fileId
router.get('/:fileId', verifyToken, async (req, res) => {
  try {
    const reviews = await ReviewComment.findByFile(req.params.fileId);
    res.json({ reviews });
  } catch (err) {
    console.error('[REVIEWS] Fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await ReviewComment.delete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit(`file-comment-delete`, { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[REVIEWS] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete comment.' });
  }
});

module.exports = router;
