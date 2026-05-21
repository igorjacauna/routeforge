-- Drop all existing policies to recreate without recursion
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'Users can read own profile',
        'Users can insert own profile',
        'Users can update own profile',
        'Owners can manage workspaces',
        'Members can view workspaces',
        'Owners can manage team members',
        'Users can read own membership',
        'Users can accept own membership',
        'Users can leave workspace',
        'Owners can manage invitations',
        'Users can read own invitations',
        'Users can accept own invitations',
        'Owners can manage folders',
        'Editors can manage folders',
        'Viewers can see folders',
        'Owners can manage files',
        'Editors can manage files',
        'Viewers can see files',
        'Owners can manage file versions',
        'Editors can insert file versions',
        'Members can view file versions',
        'Owners can manage share links',
        'Editors can manage share links',
        'Anyone can read active share links by token',
        'Members can manage collaboration sessions'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Helper functions (SECURITY DEFINER to bypass RLS)

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE workspace_id = ws_id
      AND user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
      AND status = 'accepted'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = ws_id
      AND owner_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  )
$$;

-- ============================================
-- users
-- ============================================
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth_id = auth.uid());

-- ============================================
-- workspaces
-- ============================================
CREATE POLICY "Owners can manage workspaces" ON workspaces
  FOR ALL USING (owner_id = current_user_id());

CREATE POLICY "Members can view workspaces" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

-- ============================================
-- team_members
-- ============================================
CREATE POLICY "Owners can manage team members" ON team_members
  FOR ALL USING (is_workspace_owner(team_members.workspace_id));

CREATE POLICY "Users can read own membership" ON team_members
  FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can accept own membership" ON team_members
  FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can leave workspace" ON team_members
  FOR DELETE USING (user_id = current_user_id());

-- ============================================
-- workspace_invitations
-- ============================================
CREATE POLICY "Owners can manage invitations" ON workspace_invitations
  FOR ALL USING (is_workspace_owner(workspace_invitations.workspace_id));

CREATE POLICY "Users can read own invitations" ON workspace_invitations
  FOR SELECT USING (invited_email = (SELECT email FROM users WHERE id = current_user_id()));

CREATE POLICY "Users can accept own invitations" ON workspace_invitations
  FOR UPDATE USING (invited_email = (SELECT email FROM users WHERE id = current_user_id()));

-- ============================================
-- folders
-- ============================================
CREATE POLICY "Owners can manage folders" ON folders
  FOR ALL USING (is_workspace_owner(folders.workspace_id));

CREATE POLICY "Editors can manage folders" ON folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = folders.workspace_id
        AND user_id = current_user_id()
        AND status = 'accepted'
        AND role = 'editor'
        AND (
          folder_id IS NULL
          OR folder_id = folders.id
          OR folder_id = folders.parent_folder_id
        )
    )
  );

CREATE POLICY "Viewers can see folders" ON folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = folders.workspace_id
        AND user_id = current_user_id()
        AND status = 'accepted'
        AND (
          folder_id IS NULL
          OR folder_id = folders.id
          OR folder_id = folders.parent_folder_id
        )
    )
  );

-- ============================================
-- files
-- ============================================
CREATE POLICY "Owners can manage files" ON files
  FOR ALL USING (is_workspace_owner(files.workspace_id));

CREATE POLICY "Editors can manage files" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = files.workspace_id
        AND user_id = current_user_id()
        AND status = 'accepted'
        AND role = 'editor'
        AND (
          folder_id IS NULL
          OR folder_id = files.folder_id
        )
    )
  );

CREATE POLICY "Viewers can see files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = files.workspace_id
        AND user_id = current_user_id()
        AND status = 'accepted'
        AND (
          folder_id IS NULL
          OR folder_id = files.folder_id
        )
    )
  );

-- ============================================
-- file_versions
-- ============================================
CREATE POLICY "Owners can manage file versions" ON file_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE file_versions.file_id = files.id
        AND is_workspace_owner(files.workspace_id)
    )
  );

CREATE POLICY "Editors can insert file versions" ON file_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM files
      JOIN team_members ON team_members.workspace_id = files.workspace_id
      WHERE file_versions.file_id = files.id
        AND team_members.user_id = current_user_id()
        AND team_members.status = 'accepted'
        AND team_members.role = 'editor'
    )
  );

CREATE POLICY "Members can view file versions" ON file_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM files
      JOIN team_members ON team_members.workspace_id = files.workspace_id
      WHERE file_versions.file_id = files.id
        AND team_members.user_id = current_user_id()
        AND team_members.status = 'accepted'
    )
  );

-- ============================================
-- share_links
-- ============================================
CREATE POLICY "Owners can manage share links" ON share_links
  FOR ALL USING (is_workspace_owner(share_links.workspace_id));

CREATE POLICY "Editors can manage share links" ON share_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE workspace_id = share_links.workspace_id
        AND user_id = current_user_id()
        AND status = 'accepted'
        AND role = 'editor'
    )
  );

CREATE POLICY "Anyone can read active share links by token" ON share_links
  FOR SELECT USING (is_active = true);

-- ============================================
-- collaboration_sessions
-- ============================================
CREATE POLICY "Members can manage collaboration sessions" ON collaboration_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE collaboration_sessions.file_id = files.id
        AND (
          is_workspace_owner(files.workspace_id)
          OR is_workspace_member(files.workspace_id)
        )
    )
  );
