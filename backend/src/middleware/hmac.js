import crypto from 'crypto';

const MAX_SKEW_MS = 5 * 60 * 1000;

// H-05: Fail-closed HMAC — refuse to start in production without the secret
if (process.env.NODE_ENV === 'production' && !process.env.REQUEST_HMAC_SECRET) {
  // Log clearly and crash — better to hard-fail than silently accept unsigned requests
  console.error('❌ FATAL: REQUEST_HMAC_SECRET is required in production.');
  console.error('   Set it in your .env file. All generate requests would be unprotected without it.');
  process.exit(1);
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyHmac(req, res, next) {
  const secret = process.env.REQUEST_HMAC_SECRET;
  // In development, skip HMAC if secret not configured (dev convenience only)
  if (!secret) return next();

  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing request signature headers' });
  }

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) {
    return res.status(401).json({ error: 'Invalid x-timestamp header' });
  }
  if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
    return res.status(401).json({ error: 'Request timestamp expired' });
  }

  const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (!timingSafeEqualHex(expected, String(signature))) {
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  return next();
}
