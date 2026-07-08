const express = require('express');
const Room = require('../models/Room');
const Project = require('../models/Project');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();


router.post('/', verifyToken, async (req, res) => {
  try {
    const { projectId, name } = req.body;
    if (!projectId || !name) {
      return res.status(400).json({ error: 'Project ID and room name are required.' });
    }

    const isMember = await Project.isMember(projectId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const room = await Room.create(projectId, name, req.user.id);
    res.status(201).json({ room });
  } catch (err) {
    console.error('[ROOMS] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create room.' });
  }
});


router.get('/:id', verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const isMember = await Project.isMember(room.project_id, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    res.json({ room });
  } catch (err) {
    console.error('[ROOMS] Get error:', err.message);
    res.status(500).json({ error: 'Failed to get room.' });
  }
});


router.get('/project/:projectId', verifyToken, async (req, res) => {
  try {
    const rooms = await Room.findByProject(req.params.projectId);
    res.json({ rooms });
  } catch (err) {
    console.error('[ROOMS] List error:', err.message);
    res.status(500).json({ error: 'Failed to list rooms.' });
  }
});


router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (room.created_by !== req.user.id) return res.status(403).json({ error: 'Only creator can delete.' });

    await Room.delete(req.params.id);
    res.json({ message: 'Room deleted.' });
  } catch (err) {
    console.error('[ROOMS] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete room.' });
  }
});

module.exports = router;
