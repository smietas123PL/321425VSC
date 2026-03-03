// ─── ROUTES/PROJECTS.JS ──────────────────────────────────────────────────
// Fixed C-02: IDOR on GET /:id — changed authMiddleware → requireAuth,
//             removed `req.user &&` guard that allowed unauthenticated reads.
// Fixed M-01: PUT /:id now whitelists allowed fields to prevent field injection.

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateProjectPayload } from '../middleware/validation.js';
import {
  createProject,
  getProject,
  getUserProjects,
  updateProject,
  deleteProject,
  logAudit,
} from '../db/models.js';

const router = express.Router();

// Allowed fields for project updates — prevents arbitrary field injection (M-01)
const ALLOWED_UPDATE_FIELDS = ['name', 'topic', 'level', 'description', 'agents', 'files', 'updatedAt'];

function pickAllowedFields(body) {
  const result = {};
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (body[key] !== undefined) result[key] = body[key];
  }
  return result;
}

// GET /api/v1/projects
// List all user's projects — requires authentication
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await getUserProjects(req.user.id);
    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/v1/projects/:id
// Get single project — requires authentication (C-02: was authMiddleware which allowed null user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProject(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify ownership — req.user is guaranteed non-null by requireAuth
    if (project.userId !== req.user.id) {
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
    const { name, topic, level, agents, files, createdAt, updatedAt, description } = req.body;
    // Note: client-supplied `id` is intentionally ignored — server generates ID (L-04)

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
// Update project — only whitelisted fields accepted (M-01)
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

    // M-01: Only allow whitelisted fields — prevents userId/approved injection
    const allowedUpdates = pickAllowedFields(req.body);
    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updatedProject = await updateProject(req.params.id, allowedUpdates);

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
