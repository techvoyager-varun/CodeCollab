const express = require('express');
const Version = require('../models/Version');
const File = require('../models/File');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();


router.get('/:fileId', verifyToken, async (req, res) => {
  try {
    const versions = await Version.findByFile(req.params.fileId);
    res.json({ versions });
  } catch (err) {
    console.error('[HISTORY] List error:', err.message);
    res.status(500).json({ error: 'Failed to get version history.' });
  }
});


router.post('/:fileId/snapshot', verifyToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found.' });

    const { label } = req.body;
    const version = await Version.create(req.params.fileId, file.content, req.user.id, label);
    res.status(201).json({ version });
  } catch (err) {
    console.error('[HISTORY] Snapshot error:', err.message);
    res.status(500).json({ error: 'Failed to create snapshot.' });
  }
});


router.post('/:fileId/rollback/:versionId', verifyToken, async (req, res) => {
  try {
    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ error: 'Version not found.' });

    
    const currentFile = await File.findById(req.params.fileId);
    if (currentFile) {
      await Version.create(req.params.fileId, currentFile.content, req.user.id, 'Before rollback');
    }

    const file = await File.updateContent(req.params.fileId, version.content);
    res.json({ file, message: 'Rolled back successfully.' });
  } catch (err) {
    console.error('[HISTORY] Rollback error:', err.message);
    res.status(500).json({ error: 'Failed to rollback.' });
  }
});

module.exports = router;
