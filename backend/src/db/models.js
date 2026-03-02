import { db } from './firestore.js';
import crypto from 'crypto';

// Helper for generating UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─── USERS ─────────────────────────────────────

export async function createUser(email, name, provider = 'google') {
  const id = uuidv4();
  try {
    const existing = await getUserByEmail(email);
    if (existing) {
      return existing; // Return existing if email is already tracked
    }

    const userData = { id, email, name, provider, createdAt: new Date().toISOString() };
    await db.collection('users').doc(id).set(userData);
    return userData;
  } catch (error) {
    throw error;
  }
}

export async function getUserByEmail(email) {
  const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}

export async function getUserById(id) {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) return null;
  return doc.data();
}

// ─── PROJECTS ──────────────────────────────────

export async function createProject(userId, projectData) {
  const id = projectData.id || uuidv4();
  const now = new Date().toISOString();
  const createdAt = projectData.createdAt || now;
  const updatedAt = projectData.updatedAt || now;

  const data = {
    id,
    userId,
    name: projectData.name || 'Untitled Project',
    topic: projectData.topic || '',
    level: projectData.level || 'intermediate',
    description: projectData.description || '',
    agents: projectData.agents || [],
    files: projectData.files || [],
    createdAt,
    updatedAt
  };

  try {
    await db.collection('projects').doc(id).set(data);
    return data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function getProject(projectId) {
  const doc = await db.collection('projects').doc(projectId).get();
  if (!doc.exists) return null;
  return doc.data();
}

export async function getUserProjects(userId, limitNum = 50) {
  const snapshot = await db.collection('projects')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(limitNum)
    .get();

  const projects = [];
  snapshot.forEach(doc => projects.push(doc.data()));
  return projects;
}

export async function updateProject(projectId, updateData) {
  const now = new Date().toISOString();
  const updates = { ...updateData, updatedAt: updateData.updatedAt || now };

  // Clean undefined properties
  Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

  try {
    await db.collection('projects').doc(projectId).update(updates);
    return getProject(projectId);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

export async function deleteProject(projectId) {
  await db.collection('projects').doc(projectId).delete();
  return { success: true };
}

// ─── REFRESH TOKENS ────────────────────────────

export async function createRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days valid

  await db.collection('refresh_tokens').doc(token).set({
    userId,
    token,
    expiresAt: expiresAt.toISOString()
  });

  return token;
}

export async function getRefreshToken(token) {
  const doc = await db.collection('refresh_tokens').doc(token).get();
  if (!doc.exists) return null;
  return doc.data();
}

export async function deleteRefreshToken(token) {
  await db.collection('refresh_tokens').doc(token).delete();
}

// ─── AUDIT LOG ─────────────────────────────────

export async function logAudit(userId, action, resource, details, ipAddress) {
  try {
    await db.collection('audit_logs').add({
      userId: userId || null,
      action,
      resource,
      details,
      ipAddress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

// ─── COMMUNITY TEMPLATES (v1.4.0) ──────────────

export async function createCommunityTemplate(userId, templateData) {
  const id = uuidv4();
  const now = new Date().toISOString();

  const data = {
    id,
    userId,
    name: templateData.name,
    description: templateData.description || '',
    category: templateData.category || 'general',
    difficulty: templateData.difficulty || 'intermediate',
    agents: templateData.agents || [],
    approved: false, // Not approved yet
    createdAt: now,
    updatedAt: now
  };

  try {
    await db.collection('community_templates').doc(id).set(data);
    return data;
  } catch (error) {
    console.error('Error creating community template:', error);
    throw error;
  }
}

export async function getApprovedTemplates(limitNum = 100) {
  const snapshot = await db.collection('community_templates')
    .where('approved', '==', true)
    .orderBy('downloads', 'desc')
    .orderBy('createdAt', 'desc')
    .limit(limitNum)
    .get();

  const templates = [];
  snapshot.forEach(doc => templates.push(doc.data()));
  return templates;
}
