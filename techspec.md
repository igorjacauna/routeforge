# RouteForge — Technical Specification

## 1. Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│              Firebase App Hosting (Cloud Run)              │
│                    Nuxt 4 + Nuxt UI                        │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │ Frontend Pages   │    │ Nitro API Routes (/server)   │   │
│  │ - Google OAuth   │    │ - REST endpoints             │   │
│  │ - Workspace UI   │    │ - WebSocket handlers         │   │
│  │ - Editor         │    │ - Auth guards                │   │
│  │ - File tree      │    │ - Business logic             │   │
│  └──────────────────┘    └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │                       │
         ┌──────▼──────────┐    ┌──────▼────────────────┐
         │    Supabase     │    │ Upstash Redis         │
         │  ┌────────────┐ │    │ (Real-time sync)      │
         │  │PostgreSQL  │ │    │                       │
         │  │- users     │ │    │ Handles:              │
         │  │- workspaces│ │    │ - File sessions       │
         │  │- files     │ │    │ - Cursor positions    │
         │  │- folders   │ │    │ - Content changes     │
         │  │- share_links
         │  │- team_members
         │  │- file_versions
         │  └────────────┘ │
         │  ┌────────────┐ │
         │  │ OAuth 2.0  │ │
         │  │ - Google   │ │
         │  │ - JWT      │ │
         │  └────────────┘ │
         └─────────────────┘
```

### Stack Justification

**Supabase** over Firebase: PostgreSQL allows complex queries (search), full ACID transactions (critical for sync), larger free quotas for concurrent connections (important for real-time).

**Nitro Backend**: Native Nuxt integration; runs on same server; uses Supabase Auth directly without extra OAuth/login layer.

**Upstash Redis** over self-hosted: 
- Free tier: 10k commands/day (sufficient for MVP)
- Serverless; no infra to manage
- Built-in rate limiting & DDoS protection
- RESTful API (works where WebSocket might be blocked)

**Firebase App Hosting** (Recommended):
- Free tier: 180 min/day CPU (Cloud Run under the hood)
- Automatic scaling; pay only for what you use
- Built-in DDoS protection (Cloud Run security)
- Deploy: `firebase deploy` one-command
- Cost: $0 MVP, $0.40/1M requests at scale
- Advantage: You already use Firebase; Google OAuth is native

**Alternatives**:
- **Vercel**: Free but vulnerable to bot charges (your concern is valid)
- **Render**: Free but slow cold starts (15-30s spin-up delay)
- **Self-hosted (DigitalOcean)**: $5/month fixed; complete control

---

## 2. Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(2048),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Profile settings
  display_name VARCHAR(255),
  theme ENUM('light', 'dark') DEFAULT 'light',
  
  -- Auth metadata (managed by Supabase Auth, but cached)
  auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
```

#### `workspaces`
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My Workspace',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Settings
  default_sharing VARCHAR(50) DEFAULT 'private', -- 'public' or 'private'
  max_storage_mb INT DEFAULT 5000, -- 5GB free tier
  
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);
```

#### `folders`
```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL REFERENCES users(id),
  
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT unique_folder_per_parent UNIQUE (workspace_id, parent_folder_id, name)
);

CREATE INDEX idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX idx_folders_created_by_id ON folders(created_by_id);
```

#### `files`
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT DEFAULT '',
  content_hash VARCHAR(64), -- SHA-256 for deduplication
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL REFERENCES users(id),
  updated_by_id UUID NOT NULL REFERENCES users(id),
  
  -- Metadata
  file_size_bytes INT DEFAULT 0,
  version INT DEFAULT 1,
  
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT unique_file_per_folder UNIQUE (workspace_id, folder_id, name)
);

CREATE INDEX idx_files_workspace_id ON files(workspace_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_created_by_id ON files(created_by_id);
CREATE INDEX idx_files_updated_at ON files(updated_at);

-- Full-text search index
CREATE INDEX idx_files_name_content_search ON files USING GIN (
  to_tsvector('english', name || ' ' || content)
);
```

#### `file_versions`
```sql
CREATE TABLE file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL REFERENCES users(id),
  version_number INT NOT NULL,
  change_summary TEXT, -- Optional note about what changed
  
  CONSTRAINT unique_version UNIQUE (file_id, version_number)
);

CREATE INDEX idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX idx_file_versions_created_at ON file_versions(created_at);
```

#### `share_links`
```sql
CREATE TABLE share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL, -- Random slug
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  
  -- Access control
  access_type VARCHAR(50) NOT NULL, -- 'public', 'private'
  permission VARCHAR(50) DEFAULT 'view', -- 'view', 'edit'
  allow_download BOOLEAN DEFAULT TRUE,
  
  -- Expiration
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_target CHECK (
    (workspace_id IS NOT NULL AND file_id IS NULL AND folder_id IS NULL) OR
    (workspace_id IS NOT NULL AND file_id IS NOT NULL AND folder_id IS NULL) OR
    (workspace_id IS NOT NULL AND file_id IS NULL AND folder_id IS NOT NULL)
  )
);

CREATE INDEX idx_share_links_token ON share_links(token);
CREATE INDEX idx_share_links_created_by_id ON share_links(created_by_id);
CREATE INDEX idx_share_links_expires_at ON share_links(expires_at);
```

#### `team_members`
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'editor', -- 'editor', 'viewer'
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  
  CONSTRAINT unique_team_member UNIQUE (workspace_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('editor', 'viewer')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX idx_team_members_workspace_id ON team_members(workspace_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
```

#### `collaboration_sessions`
```sql
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Cursor position (updated in real-time)
  cursor_position INT DEFAULT 0
);

CREATE INDEX idx_collaboration_sessions_file_id ON collaboration_sessions(file_id);
CREATE INDEX idx_collaboration_sessions_user_id ON collaboration_sessions(user_id);
CREATE INDEX idx_collaboration_sessions_is_active ON collaboration_sessions(is_active);
```

---

## 3. API Endpoints (Nitro)

### Authentication Endpoints

```
GET /api/auth/google
  Query: { redirectUrl }
  Response: { authUrl } // Redirect to Google OAuth
  
POST /api/auth/google/callback
  Request: { code, state }
  Response: { user, session, jwt }
  
POST /api/auth/logout
  Response: { success }
  
POST /api/auth/refresh
  Response: { session }
```

### Workspace Endpoints

```
GET /api/workspaces
  Response: { workspaces[] }
  
POST /api/workspaces
  Request: { name }
  Response: { workspace }
  
PATCH /api/workspaces/:id
  Request: { name?, default_sharing? }
  Response: { workspace }
  
DELETE /api/workspaces/:id
  Response: { success }
  
GET /api/workspaces/:id/export
  Response: { zipUrl } (async; returns presigned S3 URL)
```

### File & Folder Endpoints

```
GET /api/workspaces/:id/files
  Query: { folderId? }
  Response: { files[], folders[] }
  
POST /api/workspaces/:id/files
  Request: { name, folderId? }
  Response: { file }
  
PATCH /api/files/:id
  Request: { name?, content?, folderId? }
  Response: { file }
  
DELETE /api/files/:id
  Response: { success }
  
GET /api/files/:id/content
  Response: { content, version }
  
POST /api/files/:id/move
  Request: { targetFolderId }
  Response: { file }

-- Folder operations
POST /api/workspaces/:id/folders
  Request: { name, parentFolderId? }
  Response: { folder }
  
PATCH /api/folders/:id
  Request: { name? }
  Response: { folder }
  
DELETE /api/folders/:id
  Response: { success }
```

### Search Endpoint

```
GET /api/workspaces/:id/search
  Query: { q, folderId? }
  Response: { results[] } // Files and folders matching query
```

### Sharing Endpoints

```
POST /api/files/:id/share
  Request: { accessType: 'public'|'private', permission: 'view'|'edit', expiresAt? }
  Response: { shareLink }
  
GET /api/share/:token
  Response: { content, metadata } // No auth required
  
POST /api/share/:token/download
  Query: { format: 'txt'|'md'|'json'|'zip' }
  Response: { downloadUrl }
  
DELETE /api/share-links/:id
  Response: { success }
```

### Team Endpoints

```
GET /api/workspaces/:id/team
  Response: { members[] }
  
POST /api/workspaces/:id/team/invite
  Request: { email, role: 'editor'|'viewer' }
  Response: { invitation }
  
PATCH /api/team-members/:id
  Request: { role? }
  Response: { member }
  
DELETE /api/team-members/:id
  Response: { success }
```

### Collaboration Endpoints (WebSocket)

```
WebSocket /api/collab/:fileId
  
  Client → Server:
    { type: 'join', userId }
    { type: 'edit', position, content, version }
    { type: 'cursor', position }
    { type: 'leave' }
  
  Server → Clients:
    { type: 'user_joined', user }
    { type: 'content_change', position, content, userId, timestamp }
    { type: 'cursor_moved', userId, position }
    { type: 'user_left', userId }
    { type: 'conflict', message } // Last-write-wins conflict
```

---

## 4. Real-Time Collaboration Architecture

### WebSocket Flow with Socket.io

1. **Client connects** when opening a file
   ```javascript
   // Frontend
   const socket = io(`/api/collab/${fileId}`, {
     auth: { token: sessionToken }
   })
   
   socket.on('connect', () => {
     socket.emit('join', { fileId, userId })
   })
   ```

2. **Server tracks sessions**
   ```javascript
   // Backend (Nitro + Socket.io)
   io.on('connection', (socket) => {
     socket.on('join', ({ fileId, userId }) => {
       // Add to collaboration_sessions table
       socket.join(`file:${fileId}`)
       socket.broadcast.to(`file:${fileId}`).emit('user_joined', { userId })
     })
   })
   ```

3. **Content sync on edit**
   ```javascript
   // Client detects change (via CodeMirror onChange)
   editor.on('change', () => {
     socket.emit('edit', {
       position: cursor.position,
       content: editor.getValue(),
       version: currentVersion
     })
   })
   
   // Server broadcasts to all users in file
   socket.on('edit', (data) => {
     // Update files table with new content
     // Broadcast to all in room
     io.to(`file:${fileId}`).emit('content_change', {
       userId: socket.userId,
       position: data.position,
       content: data.content,
       timestamp: now()
     })
   })
   ```

4. **Cursor tracking**
   ```javascript
   // Client sends cursor position
   editor.on('cursorActivity', (editor) => {
     socket.emit('cursor', {
       position: editor.indexFromPos(editor.getCursor())
     })
   })
   
   // Server broadcasts cursor positions
   socket.on('cursor', (data) => {
     io.to(`file:${fileId}`).emit('cursor_moved', {
       userId: socket.userId,
       position: data.position
     })
   })
   ```

### Conflict Resolution (Last-Write-Wins)

- Each edit includes a `version` number
- Server tracks `currentVersion` for each file
- If incoming edit has `version < currentVersion`, it's a stale edit — reject or merge
- Rejected edits trigger a `conflict` event to the client
- User can undo or accept the overwrite

### Session Cleanup

- When client disconnects: remove from `collaboration_sessions`, notify others
- Periodic cleanup: remove sessions older than 30 minutes
- On file delete: end all collaboration sessions for that file

### Redis Usage (Upstash)

Store ephemeral data that doesn't need persistence:
```
file:{fileId}:session:keys -> Set of active session IDs
file:{fileId}:session:{sessionId} -> { userId, cursorPos, lastActive }
file:{fileId}:lock -> Distributed lock (for conflict detection)
rate_limit:{userId}:{endpoint} -> Counter for rate limiting
```

Example quota: 10k commands/day on Upstash free tier is sufficient for MVP (≈700 daily active users with light collaboration)

---

## 5. Frontend Architecture (Nuxt + Nuxt UI)

### Project Structure
```
routeforge/
├── app.vue                          # Root layout
├── nuxt.config.ts                   # Nuxt configuration
├── tailwind.config.ts               # Tailwind config
├── package.json
│
├── pages/
│   ├── index.vue                    # Landing page
│   ├── auth/
│   │   ├── login.vue
│   │   ├── signup.vue
│   │   ├── forgot-password.vue
│   │   └── reset-password.vue
│   ├── workspace/
│   │   └── [id]/
│   │       └── index.vue            # Main workspace editor
│   └── share/
│       └── [token].vue              # Public share view
│
├── components/
│   ├── Editor/
│   │   ├── RouteEditor.vue          # Main editor (CodeMirror)
│   │   ├── Tokenizer.ts             # Custom syntax highlighter
│   │   └── FoldingManager.ts        # Handle route folding
│   ├── FileExplorer/
│   │   ├── FileTree.vue             # Tree view sidebar
│   │   ├── TreeNode.vue             # Individual file/folder
│   │   └── ContextMenu.vue          # Right-click menu
│   ├── Sharing/
│   │   ├── ShareModal.vue           # Public/private share UI
│   │   └── TeamInvite.vue           # Team member invite
│   ├── Settings/
│   │   ├── AccountSettings.vue
│   │   ├── WorkspaceSettings.vue
│   │   └── TeamSettings.vue
│   └── Layout/
│       ├── Header.vue               # Top navbar
│       └── Sidebar.vue              # File explorer sidebar
│
├── composables/
│   ├── useAuth.ts                   # Auth state & methods
│   ├── useWorkspace.ts              # Workspace operations
│   ├── useFiles.ts                  # File CRUD
│   ├── useCollaboration.ts          # WebSocket connection
│   └── useSearch.ts                 # Search functionality
│
├── utils/
│   ├── tokenizer.ts                 # Route syntax tokenizer
│   ├── api.ts                       # Fetch wrapper with auth
│   ├── validators.ts                # Form validation
│   └── storage.ts                   # Local storage helpers
│
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup.post.ts
│   │   │   ├── login.post.ts
│   │   │   └── ...
│   │   ├── files/
│   │   │   ├── index.get.ts
│   │   │   ├── [id].patch.ts
│   │   │   └── ...
│   │   ├── workspaces/
│   │   │   ├── [id].get.ts
│   │   │   └── ...
│   │   ├── share/
│   │   │   ├── [token].get.ts
│   │   │   └── ...
│   │   └── search/
│   │       └── [workspaceId].get.ts
│   │
│   ├── socket.ts                    # Socket.io handler
│   ├── middleware/
│   │   ├── auth.ts                  # Auth guard
│   │   └── cors.ts                  # CORS config
│   └── utils/
│       ├── db.ts                    # Supabase client
│       └── permissions.ts           # Authorization checks
│
└── public/
    └── ...
```

### Key Components

**RouteEditor.vue** (Monaco or CodeMirror)
- Displays file content with line numbers
- Integrates custom tokenizer for syntax highlighting
- Auto-save debounced to server every 2 seconds
- Keyboard shortcuts: Cmd+S (save), Cmd+K (search), Cmd+Shift+P (command palette)

**FileTree.vue** (Sidebar)
- Hierarchical tree of folders/files
- Drag-and-drop support
- Right-click context menu
- Breadcrumb navigation at top
- Shows current file highlighted

**ShareModal.vue**
- Two sections: Public Links and Private Sharing
- Generate public link with toggle
- Invite team members with role selector
- Copy link button
- Expiration settings

**useCollaboration composable**
- Manages WebSocket connection via Socket.io
- Listens for content changes, cursor updates, user joins/leaves
- Broadcasts local edits to all users in file
- Displays active users and their cursors

---

## 6. Syntax Highlighter

### Tokenizer Rules

```typescript
// Custom lexer for route syntax
const tokens = [
  { pattern: /^#\s*(.+)$/, type: 'section_title', color: '#4A90E2' },
  { pattern: /(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/, type: 'http_method', color: '#7ED321' },
  { pattern: /\/[\w\/-]*/, type: 'path', color: '#417505' },
  { pattern: /<(\w+)>/, type: 'type_parameter', color: '#F5A623' },
  { pattern: /:\s*([a-zA-Z_]\w*)/, type: 'type_name', color: '#BD10E0' },
  { pattern: /\/\/.+$/, type: 'comment', color: '#B8BEC3' },
  { pattern: /\/\*[\s\S]*?\*\//, type: 'comment_block', color: '#B8BEC3' },
  { pattern: /#.+$/, type: 'comment_hash', color: '#B8BEC3' },
  { pattern: /(\{|\}|\[|\])/, type: 'bracket', color: '#000000' },
  { pattern: /string|number|boolean|array|object/, type: 'type_keyword', color: '#BD10E0' },
];

// Returns array of { start, end, type, color }
function tokenize(text: string): Token[] {
  // Implementation
}
```

### Integration with CodeMirror/Monaco

```typescript
import { defineMode } from 'codemirror'

defineMode('routeforge', (config) => {
  return {
    token: (stream) => {
      // Skip whitespace
      if (stream.eatSpace()) return null
      
      // Try each pattern
      for (const token of tokens) {
        if (stream.match(token.pattern)) {
          return token.type
        }
      }
      
      // Default: skip character
      stream.next()
      return null
    }
  }
})

// In Monaco:
monaco.languages.register({ id: 'routeforge' })
monaco.languages.setMonarchTokensProvider('routeforge', {
  tokenizer: { root: rules }
})
```

---

## 7. Deployment Strategy

### Development
```bash
# Local setup
npm install
cp .env.example .env.local

# Set Supabase credentials
NUXT_PUBLIC_SUPABASE_URL=<local_or_dev_project>
NUXT_PUBLIC_SUPABASE_ANON_KEY=<key>

# Start dev server with WebSocket support
npm run dev
```

### Production on Firebase App Hosting

**Recommended: Firebase App Hosting** (free tier, automatic scaling, no bot charges)

1. **Setup Firebase Project**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize in project
   firebase init hosting
   
   # Create App Hosting resource in Firebase Console
   # (Google Cloud Console > Firebase > Hosting > App Hosting)
   ```

2. **Environment Variables** (Firebase Console → Settings → Environment)
   ```
   NUXT_PUBLIC_SUPABASE_URL=https://...supabase.co
   NUXT_PUBLIC_SUPABASE_ANON_KEY=<production_key>
   NUXT_SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   NUXT_PUBLIC_GOOGLE_CLIENT_ID=<google_oauth_client_id>
   GOOGLE_CLIENT_SECRET=<google_oauth_secret>
   UPSTASH_REDIS_REST_URL=<from_upstash_dashboard>
   UPSTASH_REDIS_REST_TOKEN=<from_upstash_dashboard>
   NODE_ENV=production
   ```

3. **Build Configuration** (firebase.json)
   ```json
   {
     "hosting": {
       "appHosting": {
         "runtimeConfig": {
           "nodeVersion": "18"
         }
       },
       "source": "."
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```
   Or set up GitHub auto-deploy in Firebase Console (recommended).

5. **Database Migrations** (Run once after deploy)
   ```bash
   npm run migrate:prod
   ```

6. **WebSocket Configuration**
   - Firebase App Hosting (Cloud Run) supports WebSockets natively
   - Socket.io works out-of-the-box
   - Built-in DDoS protection prevents bot charges

### Alternative: Self-Hosted on DigitalOcean / Linode

**$5/month droplet** with Docker:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "preview"]
```

**Docker Compose** (Upstash Redis, Supabase remote)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NUXT_PUBLIC_SUPABASE_URL
      - NUXT_PUBLIC_SUPABASE_ANON_KEY
      - NUXT_SUPABASE_SERVICE_ROLE_KEY
      - UPSTASH_REDIS_REST_URL
      - UPSTASH_REDIS_REST_TOKEN
      - NUXT_PUBLIC_GOOGLE_CLIENT_ID
      - GOOGLE_CLIENT_SECRET
      - NODE_ENV=production
    restart: unless-stopped
```

**DigitalOcean Setup** (one-time):
```bash
# Create $5/month droplet (Ubuntu 22.04)
# SSH in and run:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone repo
git clone https://github.com/yourorg/routeforge.git
cd routeforge

# Set up .env
cp .env.example .env.production
nano .env.production  # Add secrets

# Deploy
docker-compose -f docker-compose.yml up -d

# SSL (Let's Encrypt via caddy)
# Use caddy reverse proxy in compose file
```

---

## 8. Security Considerations

### Authentication & Authorization

- **OAuth 2.0 with Google**: Only authentication method; Supabase Auth provider
- **JWT tokens**: Issued by Supabase; stored in HTTP-only cookies
- **CORS**: Allow only trusted origins (frontend domain)
- **CSRF**: Use SameSite cookies
- **Rate limiting**: 
  - OAuth callback: 5 attempts per IP per hour
  - API endpoints: 100 requests per user per minute (Upstash enforced)
  - Bot detection: Monitor for unusual patterns (high request volume, missing User-Agent)

### Endpoint Security

- **Auth guards**: Every mutating endpoint (`POST`, `PATCH`, `DELETE`) requires valid JWT
- **Ownership checks**: User can only edit their own files/workspace
- **Share link validation**: Token must exist, be non-expired, and have correct permissions
- **RLS policies**: Supabase Row-Level Security enforces authorization at DB layer

### Data Security

- **Encryption in transit**: All requests over HTTPS/TLS
- **File content**: Stored as plain text in DB; optional encryption-at-rest (Supabase Pro feature)
- **Sensitive endpoints**: Use service role key only (never expose in frontend)
- **Session management**: Max 24h session validity; refresh token rotation

### Input Validation

- **File names**: Alphanumeric, hyphens, underscores, dots; max 255 chars
- **Content size**: Max 5MB per file (free tier limit)
- **Search queries**: Sanitize to prevent SQL injection (use parameterized queries)
- **API payloads**: Validate type, length, format on every endpoint

### Monitoring & Logging

- **Error tracking**: Sentry for uncaught exceptions
- **Audit logs**: Log all file edits, sharing changes, team member additions (optional)
- **Performance**: Monitor API response times, database query times
- **Uptime**: StatusPage.io for public status

---

## 9. Free Tier Quota Analysis

### Supabase
- **PostgreSQL**: 500 MB storage (plenty for MVP)
- **Auth**: Unlimited users
- **Realtime**: Unlimited connections
- **RESTful API**: 250k requests/month (36k/day; sufficient for single team)
- **Storage**: 1 GB (for exports, not used in MVP)

### Vercel
- **Compute**: Unlimited deployments; 100 GB bandwidth/month (sufficient)
- **Serverless functions**: 1 million invocations/month (plenty)
- **WebSockets**: Available on Pro plan; free tier has limitations

### Upstash Redis
- **Free tier**: 10k commands/day, 256MB storage
- **Pricing**: $0.20 per 100k commands (scales gradually)
- **DDoS protection**: Built-in; no worries about bot attacks
- **REST API**: Works everywhere (fallback if WebSocket blocked)

### Monitoring
- **Sentry**: 5k errors/month (free tier)
- **LogRocket**: 50 sessions/month (free tier, good for MVP)

### Cost Breakdown (Monthly)
- **Firebase App Hosting**: Free (180 min/day CPU); $0.40/1M requests at scale
- **Supabase**: Free (500 MB DB, unlimited auth)
- **Upstash Redis**: Free (10k commands/day); $0.20/100k commands at scale
- **Google OAuth**: Free
- **Monitoring (Sentry/LogRocket)**: Free tier

**MVP Phase**: $0 (completely free)
**Growth Phase**: ~$50–100/month (scales gradually, transparent)

---

## 10. Implementation Roadmap

### Phase 1 (MVP): Weeks 1–4
1. Setup Nuxt 4 + Supabase + Google OAuth (Features #1–4)
2. File/folder CRUD + tree UI (Features #5–6)
3. Basic editor + auto-save (Feature #7)
4. Google OAuth login flow (Feature #1)

### Phase 2: Weeks 5–6
5. Syntax highlighting (Feature #8)
6. Route folding (Feature #9)
7. Search (Feature #13)
8. Public sharing (Feature #14)

### Phase 3: Weeks 7–8
9. Real-time WebSocket setup (Features #10–12)
10. Team member invites (Feature #16)
11. Settings pages (Features #19–20)

### Phase 4: Weeks 9+
12. Download/export (Feature #15)
13. Private invite links (Feature #17)
14. File history (Feature #18)
15. Analytics & monitoring (Feature #24)
