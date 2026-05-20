-- Adiciona folder_id em team_members para permissões por pasta
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE CASCADE;

-- Remove a constraint única antiga (workspace_id, user_id)
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS unique_team_member;

-- Índices únicos parciais para tratar folder_id nullable corretamente
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_ws_user_workspace_level
  ON team_members (workspace_id, user_id) WHERE folder_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_ws_user_folder_level
  ON team_members (workspace_id, user_id, folder_id) WHERE folder_id IS NOT NULL;

-- Adiciona folder_id em workspace_invitations
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE CASCADE;

-- Remove constraint única antiga
ALTER TABLE workspace_invitations DROP CONSTRAINT IF EXISTS unique_pending_invite;

-- Índices únicos parciais para workspace_invitations
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_invitations_unique_workspace_level
  ON workspace_invitations (workspace_id, invited_email) WHERE folder_id IS NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_invitations_unique_folder_level
  ON workspace_invitations (workspace_id, folder_id, invited_email) WHERE folder_id IS NOT NULL AND status = 'pending';
