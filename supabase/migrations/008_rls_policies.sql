-- ============================================
-- RLS Policies for all tables
-- ============================================

-- Helper: resolve public.users.id from auth.uid()
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$;

-- ============================================
-- users
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- INSERT is handled by the SECURITY DEFINER trigger (handle_new_user)

-- ============================================
-- workspaces
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage workspaces" ON workspaces
  FOR ALL USING (owner_id = current_user_id());

CREATE POLICY "Members can view workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = workspaces.id
        AND user_id = current_user_id()
        AND status = 'accepted'
    )
  );

-- ============================================
-- team_members
-- ============================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = team_members.workspace_id
        AND owner_id = current_user_id()
    )
  );

CREATE POLICY "Users can read own membership" ON team_members
  FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can accept own membership" ON team_members
  FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can leave workspace" ON team_members
  FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- workspace_invitations
-- ============================================
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage invitations" ON workspace_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_invitations.workspace_id
        AND owner_id = current_user_id()
    )
  );

CREATE POLICY "Users can read own invitations" ON workspace_invitations
  FOR SELECT USING (invited_email = (SELECT email FROM users WHERE id = current_user_id()));

CREATE POLICY "Users can accept own invitations" ON workspace_invitations
  FOR UPDATE USING (invited_email = (SELECT email FROM users WHERE id = current_user_id()));

-- ============================================
-- folders
-- ============================================
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage folders" ON folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = folders.workspace_id
        AND owner_id = current_user_id()
    )
  );

CREATE POLICY "Editors can manage folders" ON folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.workspace_id = folders.workspace_id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND tm.role = 'editor'
        AND (
          tm.folder_id IS NULL  -- workspace-level access
          OR tm.folder_id = folders.id
          OR tm.folder_id = folders.parent_folder_id
        )
    )
  );

CREATE POLICY "Viewers can see folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.workspace_id = folders.workspace_id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND (
          tm.folder_id IS NULL
          OR tm.folder_id = folders.id
          OR tm.folder_id = folders.parent_folder_id
        )
    )
  );

-- ============================================
-- files
-- ============================================
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage files" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = files.workspace_id
        AND owner_id = current_user_id()
    )
  );

CREATE POLICY "Editors can manage files" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.workspace_id = files.workspace_id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND tm.role = 'editor'
        AND (
          tm.folder_id IS NULL
          OR tm.folder_id = files.folder_id
        )
    )
  );

CREATE POLICY "Viewers can see files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.workspace_id = files.workspace_id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND (
          tm.folder_id IS NULL
          OR tm.folder_id = files.folder_id
        )
    )
  );

-- ============================================
-- file_versions
-- ============================================
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage file versions" ON file_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM files
      JOIN workspaces ON workspaces.id = files.workspace_id
      WHERE file_versions.file_id = files.id
        AND workspaces.owner_id = current_user_id()
    )
  );

CREATE POLICY "Editors can insert file versions" ON file_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      JOIN team_members tm ON tm.workspace_id = files.workspace_id
      WHERE file_versions.file_id = files.id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND tm.role = 'editor'
    )
  );

CREATE POLICY "Members can view file versions" ON file_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files
      JOIN team_members tm ON tm.workspace_id = files.workspace_id
      WHERE file_versions.file_id = files.id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
    )
  );

-- ============================================
-- share_links
-- ============================================
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage share links" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = share_links.workspace_id
        AND owner_id = current_user_id()
    )
  );

CREATE POLICY "Editors can manage share links" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.workspace_id = share_links.workspace_id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
        AND tm.role = 'editor'
    )
  );

-- Public access: anyone can VIEW active share_links by token (for public sharing)
CREATE POLICY "Anyone can read active share links by token" ON share_links
  FOR SELECT USING (is_active = true);

-- ============================================
-- collaboration_sessions
-- ============================================
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can manage collaboration sessions" ON collaboration_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM files
      JOIN team_members tm ON tm.workspace_id = files.workspace_id
      WHERE collaboration_sessions.file_id = files.id
        AND tm.user_id = current_user_id()
        AND tm.status = 'accepted'
    )
    OR
    EXISTS (
      SELECT 1 FROM files
      JOIN workspaces w ON w.id = files.workspace_id
      WHERE collaboration_sessions.file_id = files.id
        AND w.owner_id = current_user_id()
    )
  );
