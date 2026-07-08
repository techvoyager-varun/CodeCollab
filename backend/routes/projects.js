const express = require('express');
const Project = require('../models/Project');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();


router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, description, language } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required.' });

    const project = await Project.create(name, description, req.user.id, language);
    res.status(201).json({ project });
  } catch (err) {
    console.error('[PROJECTS] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});


router.get('/', verifyToken, async (req, res) => {
  try {
    const projects = await Project.findByUser(req.user.id);
    res.json({ projects });
  } catch (err) {
    console.error('[PROJECTS] List error:', err.message);
    res.status(500).json({ error: 'Failed to list projects.' });
  }
});


router.get('/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const isMember = await Project.isMember(req.params.id, req.user.id);
    if (!isMember) return res.status(403).json({ error: 'Access denied.' });

    const members = await Project.getMembers(req.params.id);
    res.json({ project, members });
  } catch (err) {
    console.error('[PROJECTS] Get error:', err.message);
    res.status(500).json({ error: 'Failed to get project.' });
  }
});


router.put('/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can update.' });

    const updated = await Project.update(req.params.id, req.body);
    res.json({ project: updated });
  } catch (err) {
    console.error('[PROJECTS] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});


router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete.' });

    await Project.delete(req.params.id);
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error('[PROJECTS] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});


router.post('/:id/members', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can add members.' });

    await Project.addMember(req.params.id, userId, role);
    const members = await Project.getMembers(req.params.id);
    res.json({ members });
  } catch (err) {
    console.error('[PROJECTS] Add member error:', err.message);
    res.status(500).json({ error: 'Failed to add member.' });
  }
});


router.get('/:id/members', verifyToken, async (req, res) => {
  try {
    const members = await Project.getMembers(req.params.id);
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get members.' });
  }
});

module.exports = router;
