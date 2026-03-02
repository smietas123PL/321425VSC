import express from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.js';
import { validateProjectPayload } from '../middleware/validation.js';
import {
  createProject,
  getProject,
  getUserProjects,
  updateProject,
  deleteProject,
} from '../db/models.js';
import { logAudit } from '../db/models.js';

const router = express.Router();

// GET /api/v1/projects
// List all user's projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const projects = await getUserProjects(req.user.id);
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/v1/projects/:id
// Get single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (req.user && project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/v1/projects
// Create new project
router.post('/', requireAuth, async (req, res) => {
  try {
    const { id, name, topic, level, agents, files, createdAt, updatedAt, description } = req.body;

    // Validate
    const errors = validateProjectPayload({
      topic: topic || '',
      level: level || 'intermediate',
      agents: agents || [],
    });

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const project = await createProject(req.user.id, {
      id,
      name: name || 'Untitled Project',
      topic,
      level,
      description,
      agents,
      files,
      createdAt,
      updatedAt,
    });

    await logAudit(req.user.id, 'CREATE_PROJECT', 'projects', {
      projectId: project.id,
      topic,
    }, req.ip);

    res.status(201).json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/v1/projects/:id
// Update project
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedProject = await updateProject(req.params.id, req.body);

    await logAudit(req.user.id, 'UPDATE_PROJECT', 'projects', {
      projectId: req.params.id,
    }, req.ip);

    res.json({ project: updatedProject });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/v1/projects/:id
// Delete project
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership
    if (project.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await deleteProject(req.params.id);

    await logAudit(req.user.id, 'DELETE_PROJECT', 'projects', {
      projectId: req.params.id,
    }, req.ip);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
