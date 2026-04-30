-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url VARCHAR(2048),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  display_name VARCHAR(255),
  theme VARCHAR(50) DEFAULT 'light',
  auth_id UUID NOT NULL UNIQUE,
  CONSTRAINT email_format CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'My Workspace',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  default_sharing VARCHAR(50) DEFAULT 'private',
  max_storage_mb INT DEFAULT 5000,
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
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

CREATE INDEX IF NOT EXISTS idx_folders_workspace_id ON folders(workspace_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_folder_id ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_created_by_id ON folders(created_by_id);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  content TEXT DEFAULT '',
  content_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL REFERENCES users(id),
  updated_by_id UUID NOT NULL REFERENCES users(id),
  file_size_bytes INT DEFAULT 0,
  version INT DEFAULT 1,
  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT unique_file_per_folder UNIQUE (workspace_id, folder_id, name)
);

CREATE INDEX IF NOT EXISTS idx_files_workspace_id ON files(workspace_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by_id ON files(created_by_id);
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_files_name_content_search ON files USING GIN (
  to_tsvector('english', name || ' ' || content)
);

-- Create file_versions table
CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_id UUID NOT NULL REFERENCES users(id),
  version_number INT NOT NULL,
  change_summary TEXT,
  CONSTRAINT unique_version UNIQUE (file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created_at ON file_versions(created_at);

-- Create share_links table
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  access_type VARCHAR(50) NOT NULL,
  permission VARCHAR(50) DEFAULT 'view',
  allow_download BOOLEAN DEFAULT TRUE,
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

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_created_by_id ON share_links(created_by_id);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'editor',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  CONSTRAINT unique_team_member UNIQUE (workspace_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('editor', 'viewer')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_team_members_workspace_id ON team_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Create collaboration_sessions table
CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  cursor_position INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_file_id ON collaboration_sessions(file_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_user_id ON collaboration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_is_active ON collaboration_sessions(is_active);
