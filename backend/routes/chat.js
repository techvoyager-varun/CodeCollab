const express = require('express');
const Message = require('../models/Message');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();


router.get('/:roomId', verifyToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const messages = await Message.findByRoom(req.params.roomId, parseInt(limit), parseInt(offset));
    res.json({ messages });
  } catch (err) {
    console.error('[CHAT] List error:', err.message);
    res.status(500).json({ error: 'Failed to get messages.' });
  }
});


router.post('/:roomId', verifyToken, async (req, res) => {
  try {
    const { content, type, replyTo } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required.' });

    const message = await Message.create(
      req.params.roomId,
      req.user.id,
      req.user.username,
      content,
      type || 'text',
      replyTo
    );
    res.status(201).json({ message });
  } catch (err) {
    console.error('[CHAT] Send error:', err.message);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

module.exports = router;
