import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  try {
    // Extract JWT from Authorization header (Bearer token)
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      // If no token, set user as null (public routes allowed)
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Invalid token
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAuth(req, res, next) {
  // Middleware to require authentication
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function generateToken(userId, email) {
  return jwt.sign(
    { id: userId, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
