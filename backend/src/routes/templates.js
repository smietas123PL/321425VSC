// ─── ROUTES/TEMPLATES.JS — Community Templates API (G-01) ────────────────
// New endpoint for community template listing and submission.

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeString } from '../middleware/validation.js';
import { createCommunityTemplate, getApprovedTemplates } from '../db/models.js';
import { logAudit } from '../db/models.js';

const router = express.Router();

// GET /api/v1/templates
// List approved community templates (public)
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '50'), 100);
        const templates = await getApprovedTemplates(limit);
        res.json({ templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// POST /api/v1/templates
// Submit a new community template (requires auth)
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name, description, category, difficulty, agents } = req.body;

        // Basic validation
        if (!name || typeof name !== 'string' || name.trim().length < 3) {
            return res.status(400).json({ error: 'Template name is required (min 3 chars)' });
        }
        if (!Array.isArray(agents) || agents.length === 0) {
            return res.status(400).json({ error: 'agents must be a non-empty array' });
        }
        if (agents.length > 20) {
            return res.status(400).json({ error: 'Maximum 20 agents per template' });
        }

        const VALID_CATEGORIES = ['general', 'business', 'technology', 'creative', 'education', 'productivity'];
        const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

        const cleanCategory = VALID_CATEGORIES.includes(category) ? category : 'general';
        const cleanDifficulty = VALID_DIFFICULTIES.includes(difficulty) ? difficulty : 'intermediate';

        const template = await createCommunityTemplate(req.user.id, {
            name: sanitizeString(name),
            description: sanitizeString(description || ''),
            category: cleanCategory,
            difficulty: cleanDifficulty,
            agents,
        });

        await logAudit(req.user.id, 'CREATE_TEMPLATE', 'community_templates', {
            templateId: template.id,
            name: template.name,
        }, req.ip);

        res.status(201).json({
            template,
            message: 'Template submitted for review. It will appear after approval.',
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

export default router;
