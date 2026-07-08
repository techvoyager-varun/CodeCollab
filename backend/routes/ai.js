const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { askGemini, PROMPTS } = require('../services/gemini');
const { queryWithContext } = require('../services/rag');

const router = express.Router();


router.post('/ask', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { question, projectId } = req.body;
    if (!question) return res.status(400).json({ error: 'Question is required.' });

    let answer;
    if (projectId) {
      answer = await queryWithContext(question, projectId);
    } else {
      answer = await askGemini(question);
    }

    res.json({ answer });
  } catch (err) {
    console.error('[AI] Ask error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/explain', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    console.log('[AI] Explain - code:', code ? (code.length + ' chars') : 'empty', 'language:', language);
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.explain(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Explain error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/debug', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, error, language } = req.body;
    console.log('[AI] Debug - code:', code ? (code.length + ' chars') : 'empty', 'error:', error, 'language:', language);
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.debug(code, error, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Debug error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/generate-tests', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.generateTests(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Generate tests error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/optimize', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.optimize(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Optimize error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/refactor', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.refactor(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Refactor error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/review', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.review(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Review error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/document', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.document(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Document error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});


router.post('/flowchart', verifyToken, aiLimiter, async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const prompt = PROMPTS.flowchart(code, language);
    const answer = await askGemini(prompt);
    res.json({ answer });
  } catch (err) {
    console.error('[AI] Flowchart error:', err.message);
    res.status(500).json({ error: 'AI request failed.' });
  }
});

module.exports = router;
