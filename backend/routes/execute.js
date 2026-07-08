const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { executeCode } = require('../services/executor');

const router = express.Router();

// POST /api/execute
router.post('/', verifyToken, async (req, res) => {
  try {
    const { code, language, stdin } = req.body;
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required.' });
    }

    const supportedLanguages = [
      'javascript', 'python', 'typescript', 'go', 'ruby', 'php', 'shell',
      'c', 'cpp', 'java', 'rust', 'swift', 'perl', 'r', 'scala', 'haskell', 'dart'
    ];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({ error: `Language '${language}' is not supported. Supported: ${supportedLanguages.join(', ')}` });
    }

    const result = await executeCode(language, code, stdin || '');
    res.json(result);
  } catch (err) {
    console.error('[EXECUTE] Error:', err.message);
    res.status(500).json({ error: 'Code execution failed.' });
  }
});

module.exports = router;
