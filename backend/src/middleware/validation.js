export function validateProjectPayload(payload) {
  const errors = [];

  if (!payload.topic || typeof payload.topic !== 'string') {
    errors.push('topic is required and must be a string');
  }
  if (!payload.level || !['beginner', 'intermediate', 'advanced'].includes(payload.level)) {
    errors.push('level must be beginner, intermediate, or advanced');
  }
  if (!Array.isArray(payload.agents) || payload.agents.length === 0) {
    errors.push('agents must be a non-empty array');
  } else if (payload.agents.length > 100) {
    errors.push('Maximum 100 agents allowed per project');
  }

  // Sanitize strings
  if (payload.topic) {
    payload.topic = sanitizeString(payload.topic);
  }

  return errors;
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  // Basic server-side sanitization for plain-text fields.
  const noTags = str.replace(/<[^>]*>/g, ' ');
  // eslint-disable-next-line no-control-regex
  const noControlChars = noTags.replace(/[\x00-\x1F\x7F]/g, ' ');
  const collapsed = noControlChars.replace(/\s+/g, ' ').trim();
  return collapsed.substring(0, 500);
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
