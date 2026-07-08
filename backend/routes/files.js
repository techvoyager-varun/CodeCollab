const express = require('express');
const File = require('../models/File');
const Project = require('../models/Project');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/files
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, path, projectId, type, parentId, content } = req.body;
    if (!name || !projectId) {
      return res.status(400).json({ error: 'Name and project ID are required.' });
    }

    const isMember = await Project.isMember(projectId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const language = await File.detectLanguage(name);
    const file = await File.create(name, path || `/${name}`, projectId, type || 'file', parentId, language, content || '');
    res.status(201).json({ file });
  } catch (err) {
    console.error('[FILES] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create file.' });
  }
});

// GET /api/files/tree/:projectId
router.get('/tree/:projectId', verifyToken, async (req, res) => {
  try {
    const isMember = await Project.isMember(req.params.projectId, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const files = await File.getTree(req.params.projectId);
    res.json({ files });
  } catch (err) {
    console.error('[FILES] Tree error:', err.message);
    res.status(500).json({ error: 'Failed to get file tree.' });
  }
});

// GET /api/files/:id/content
router.get('/:id/content', verifyToken, async (req, res) => {
  try {
    const file = await File.getContent(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    res.json({ file });
  } catch (err) {
    console.error('[FILES] Content error:', err.message);
    res.status(500).json({ error: 'Failed to get file content.' });
  }
});

// PUT /api/files/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { content } = req.body;
    const file = await File.updateContent(req.params.id, content);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    res.json({ file });
  } catch (err) {
    console.error('[FILES] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update file.' });
  }
});

// PUT /api/files/:id/rename
router.put('/:id/rename', verifyToken, async (req, res) => {
  try {
    const { name, path } = req.body;
    if (!name) return res.status(400).json({ error: 'New name is required.' });

    const file = await File.rename(req.params.id, name, path || `/${name}`);
    if (!file) return res.status(404).json({ error: 'File not found.' });
    res.json({ file });
  } catch (err) {
    console.error('[FILES] Rename error:', err.message);
    res.status(500).json({ error: 'Failed to rename file.' });
  }
});

// DELETE /api/files/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await File.delete(req.params.id);
    res.json({ message: 'File deleted.' });
  } catch (err) {
    console.error('[FILES] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

module.exports = router;
