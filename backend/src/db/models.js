import { runQuery, getQuery, allQuery } from './init.js';

// Helper for generating UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── USERS ─────────────────────────────────────

export async function createUser(email, name, provider = 'google') {
  const id = uuidv4();
  try {
    await runQuery(
      'INSERT INTO users (id, email, name, provider) VALUES (?, ?, ?, ?)',
      [id, email, name, provider]
    );
    return { id, email, name };
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      // User already exists
      return getUserByEmail(email);
    }
    throw error;
  }
}

export async function getUserByEmail(email) {
  return getQuery('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserById(id) {
  return getQuery('SELECT * FROM users WHERE id = ?', [id]);
}

// ─── PROJECTS ──────────────────────────────────

export async function createProject(userId, projectData) {
  const id = projectData.id || uuidv4();
  const now = new Date().toISOString();
  const createdAt = projectData.createdAt || now;
  const updatedAt = projectData.updatedAt || now;

  try {
    await runQuery(
      `INSERT INTO projects 
       (id, userId, name, topic, level, description, agents, files, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        projectData.name || 'Untitled Project',
        projectData.topic || '',
        projectData.level || 'intermediate',
        projectData.description || '',
        JSON.stringify(projectData.agents || []),
        JSON.stringify(projectData.files || []),
        createdAt,
        updatedAt,
      ]
    );
    return { id, userId, ...projectData, createdAt, updatedAt };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function getProject(projectId) {
  const project = await getQuery('SELECT * FROM projects WHERE id = ?', [projectId]);
  if (project) {
    project.agents = JSON.parse(project.agents || '[]');
    project.files = JSON.parse(project.files || '[]');
  }
  return project;
}

export async function getUserProjects(userId, limit = 50) {
  const projects = await allQuery(
    'SELECT * FROM projects WHERE userId = ? ORDER BY updatedAt DESC LIMIT ?',
    [userId, limit]
  );
  return projects.map(p => ({
    ...p,
    agents: JSON.parse(p.agents || '[]'),
    files: JSON.parse(p.files || '[]'),
  }));
}

export async function updateProject(projectId, updateData) {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  // Build dynamic SET clause
  if (updateData.name !== undefined) {
    fields.push('name = ?');
    values.push(updateData.name);
  }
  if (updateData.agents !== undefined) {
    fields.push('agents = ?');
    values.push(JSON.stringify(updateData.agents));
  }
  if (updateData.files !== undefined) {
    fields.push('files = ?');
    values.push(JSON.stringify(updateData.files));
  }
  if (updateData.topic !== undefined) {
    fields.push('topic = ?');
    values.push(updateData.topic);
  }
  if (updateData.level !== undefined) {
    fields.push('level = ?');
    values.push(updateData.level);
  }
  if (updateData.description !== undefined) {
    fields.push('description = ?');
    values.push(updateData.description);
  }

  fields.push('updatedAt = ?');
  values.push(updateData.updatedAt || now);
  values.push(projectId);

  const sql = `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`;
  await runQuery(sql, values);

  return getProject(projectId);
}

export async function deleteProject(projectId) {
  await runQuery('DELETE FROM projects WHERE id = ?', [projectId]);
  return { success: true };
}

// ─── AUDIT LOG ─────────────────────────────────

export async function logAudit(userId, action, resource, details, ipAddress) {
  try {
    await runQuery(
      `INSERT INTO audit_log (userId, action, resource, details, ipAddress) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId || null, action, resource, JSON.stringify(details), ipAddress]
    );
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

// ─── COMMUNITY TEMPLATES (v1.4.0) ──────────────

export async function createCommunityTemplate(userId, templateData) {
  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    await runQuery(
      `INSERT INTO community_templates 
       (id, userId, name, description, category, difficulty, agents, approved, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        templateData.name,
        templateData.description || '',
        templateData.category || 'general',
        templateData.difficulty || 'intermediate',
        JSON.stringify(templateData.agents || []),
        false, // Not approved yet
        now,
        now,
      ]
    );
    return { id, userId, ...templateData, approved: false };
  } catch (error) {
    console.error('Error creating community template:', error);
    throw error;
  }
}

export async function getApprovedTemplates(limit = 100) {
  const templates = await allQuery(
    'SELECT * FROM community_templates WHERE approved = 1 ORDER BY downloads DESC, createdAt DESC LIMIT ?',
    [limit]
  );
  return templates.map(t => ({
    ...t,
    agents: JSON.parse(t.agents || '[]'),
  }));
}

