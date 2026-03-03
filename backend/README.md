# 🔧 AgentSpark Backend API v1.2.0

Express.js server providing secure API proxy, authentication, and data persistence for AgentSpark.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

Server runs on `http://localhost:5000`

## 📋 Setup

### 1. Environment Variables
Create `.env` file (copy from `.env.example`):

```bash
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,https://agentspark.app

# Database (Firestore)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 # Optional for local dev
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json # Production

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
REQUEST_HMAC_SECRET=change_me_hmac_secret
KEY_MODE=hybrid

# LLM API Keys (NEVER commit these!)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
GEMINI_API_KEY=AIza...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

⚠️ **CRITICAL**: Never commit `.env` file. Add to `.gitignore`.

### KEY_MODE
- `env`: always use server-side keys from `.env`
- `byok`: always require `clientApiKey` from frontend
- `hybrid` (recommended): prefer server key, fallback to BYOK

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Server

**Development** (with auto-reload):
```bash
npm run dev
```

**Production:**
```bash
NODE_ENV=production npm start
```

## 📡 API Endpoints

### Authentication

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

Response:
```json
{
  "user": { "id": "uuid", "email": "...", "name": "..." },
  "token": "jwt_token_here"
}
```

#### Google OAuth Login
```bash
POST /api/v1/auth/google
Content-Type: application/json

{
  "email": "user@gmail.com",
  "name": "John Doe",
  "googleId": "google_id_from_sdk"
}
```

#### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer <token>
```

#### Logout
```bash
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Projects

#### List User Projects
```bash
GET /api/v1/projects
Authorization: Bearer <token>
```

Response:
```json
{
  "projects": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "My Project",
      "topic": "e-commerce support",
      "level": "intermediate",
      "agents": [...],
      "files": [...],
      "createdAt": "2026-03-02T10:00:00Z",
      "updatedAt": "2026-03-02T10:00:00Z"
    }
  ]
}
```

#### Create Project
```bash
POST /api/v1/projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Support Team",
  "topic": "e-commerce support",
  "level": "intermediate",
  "agents": [
    { "name": "Agent 1", "role": "Support", ... }
  ],
  "files": []
}
```

#### Get Project
```bash
GET /api/v1/projects/:id
Authorization: Bearer <token>
```

#### Update Project
```bash
PUT /api/v1/projects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "agents": [...]
}
```

#### Delete Project
```bash
DELETE /api/v1/projects/:id
Authorization: Bearer <token>
```

### Generation (LLM Proxy)

#### Generate Agents
```bash
POST /api/v1/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "e-commerce support",
  "level": "intermediate",
  "agentCount": 3,
  "modelProvider": "anthropic",
  "modelId": "claude-3-sonnet"
}
```

Optional request verification headers (enabled when `REQUEST_HMAC_SECRET` is set):
```http
X-Timestamp: <unix-ms>
X-Signature: <hex hmac sha256 of "{timestamp}.{raw-json-body}">
```

Response:
```json
{
  "success": true,
  "agents": [
    { "id": "1", "name": "Agent 1", "role": "Specialist", ... }
  ]
}
```

## 🛡️ Security Features

### In Place (v1.2.0)
- ✅ **Helmet.js** — Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ **CORS** — Whitelist frontend origins
- ✅ **Rate Limiting** — Per-IP request throttling
- ✅ **JWT Authentication** — Stateless token-based auth
- ✅ **Input Validation** — Sanitize all user inputs
- ✅ **Audit Logging** — Log all sensitive actions
- ✅ **HTTPS** — Enabled in production (Render, Railway, Heroku)

### Best Practices
- Never commit `.env` file
- Rotate JWT_SECRET in production
- Use HTTPS only in production
- Enable 2FA for database access
- Regular security audits

## 📊 Database Schema

Firestore NoSQL database with collections:
- `users` — Authentication & profiles
- `projects` — User projects (JSON document storage)
- `project_shares` — Collaboration (v1.4.0)
- `audit_log` — Security events
- `community_templates` — User submissions (v1.4.0)

## 📈 Monitoring & Logging

View audit logs in the Firebase Console:
- Navigate to Firestore Database -> `audit_log` collection.

Check error logs:
```bash
# Development
npm run dev 2>&1 | tee server.log

# Production (Render/Railway/Heroku)
Monitor via platform dashboard
```

## 🚢 Deployment

### Option 1: Render (Recommended)
1. Push repo to GitHub
2. Connect GitHub to Render
3. Create "Web Service" from GitHub repo
4. Set environment variables in Render dashboard
5. Deploy!

### Option 2: Railway
1. `railway init`
2. Add environment variables
3. `railway up`

### Option 3: Heroku (Legacy)
```bash
heroku create agentspark-api
heroku config:set JWT_SECRET=...
git push heroku main
```

## 📝 Contributing

### Code Style
- ESLint config: `.eslintrc.json`
- Format: `npm run format`
- Lint: `npm run lint`

### Testing
```bash
npm test
```

## 📄 License
MIT
