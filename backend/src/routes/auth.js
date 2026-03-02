import express from 'express';
import { generateToken, authMiddleware, requireAuth } from '../middleware/auth.js';
import { validateEmail } from '../middleware/validation.js';
import { createUser, getUserById, getUserByEmail } from '../db/models.js';
import { logAudit } from '../db/models.js';

const router = express.Router();

// POST /api/v1/auth/register
// Simple email/password registration (placeholder - use OAuth in production)
router.post('/register', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const user = await createUser(email, name || email.split('@')[0], 'local');

    const token = generateToken(user.id, user.email);

    await logAudit(user.id, 'USER_REGISTERED', 'users', { email }, req.ip);

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/v1/auth/google
// Google OAuth login (simplified)
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email from Google' });
    }

    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser(email, name || email.split('@')[0], 'google');
    }

    const token = generateToken(user.id, user.email);

    await logAudit(user.id, 'GOOGLE_LOGIN', 'auth', { email }, req.ip);

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// GET /api/v1/auth/me
// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getUserById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/v1/auth/logout
// Logout (mainly client-side, but log the event)
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.user) {
      await logAudit(req.user.id, 'USER_LOGOUT', 'auth', {}, req.ip);
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

export default router;
