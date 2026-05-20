# RouteForge — Features

---

## 1. Email Magic Link Authentication

Enable users to create accounts and authenticate via email magic links (passwordless).

**User flow**
1. Visitor enters email address
2. System sends magic link to that email (via Supabase / Resend SMTP)
3. Visitor clicks link in email
4. Supabase validates token, creates session (JWT in HTTP-only cookie)
5. If first login: SQL trigger automatically creates user account + workspace
6. User is redirected to workspace dashboard

**UI overview**
Single login page with email input and "Send magic link" button. After sending, a confirmation screen tells the user to check their email. No passwords, no third-party OAuth consent screens.

---

## 2. Database Schema & Core Models

Define the foundational data model: users, workspaces, files, folders, sharing configurations, and real-time collaboration metadata.

**User flow**
1. System initializes PostgreSQL tables on deployment
2. Tables store: users, workspaces, files, folders, share_links, team_members, collaboration_sessions
3. Foreign keys establish relationships (e.g., files belong to folders, folders to workspaces)
4. Indexes optimize queries on commonly filtered columns

**UI overview**
No user-facing UI — this is backend infrastructure. Schema supports multi-tenancy (users own workspaces), hierarchical file organization (folders within folders), and real-time collaboration tracking (sessions, cursors, content versions).

---

## 3. User Workspace Creation & Initialization

When a user signs up or logs in for the first time, automatically create a default workspace and initialize the folder structure.

**User flow**
1. User completes sign-up and email verification
2. Backend creates a default workspace (e.g., "My Workspace")
3. Backend creates a default root folder for that workspace
4. User is redirected to the workspace dashboard
5. Workspace is ready for creating files and folders

**UI overview**
No explicit "create workspace" UI in MVP. Instead, the workspace is auto-created on first login. User sees a dashboard with an empty file tree on the left (sidebar) and a welcome message in the center, prompting them to create their first file or folder.

---

## 4. Authorization & Access Control Framework

Implement role-based and link-based access control: workspace owner, team members (editor/viewer), public links (read-only), and private invite links (configurable access).

**User flow**
1. System checks user authentication on every request
2. For workspace access, verifies user owns workspace or is a team member
3. For file access, checks: user is workspace owner, user is team member with permission, or request includes valid share link token
4. For mutations (create, edit, delete), requires editor role or ownership
5. For reads (public links), allows unauthenticated access if link is public

**UI overview**
No dedicated UI — access control is enforced on the backend. Users implicitly see this when: they can edit files they own, they cannot edit read-only shared documents, and public links work without login. In shareable UI (feature #12), users configure these permissions via dropdowns (public/private, viewer/editor).

---

## 5. File & Folder CRUD Operations

Allow users to create, read, update, and delete files and folders within their workspace.

**User flow**
1. User right-clicks in the file tree or clicks "New File" button
2. Enters file/folder name
3. File/folder is created and appears in the tree
4. User can rename by right-clicking → "Rename"
5. User can delete by right-clicking → "Delete" (with confirmation)
6. User can move files/folders via drag-and-drop in the tree

**UI overview**
Left sidebar shows a hierarchical tree view of folders and files. Each item has a context menu (right-click) with options: New File, New Folder, Rename, Delete, Share. The tree is collapsible/expandable. Files are displayed with an icon (e.g., document icon) and folders with a folder icon. Drag-and-drop visual feedback shows drop targets.

---

## 6. File Explorer UI (Sidebar & Navigation)

Display workspace structure as a collapsible tree in the sidebar, with quick access to folders and files.

**User flow**
1. User sees sidebar with workspace root folder
2. User clicks folder icon to expand/collapse
3. User clicks file to open it in the editor
4. User clicks breadcrumb at the top to jump to any ancestor folder
5. User right-clicks on folder/file to see context menu

**UI overview**
Sidebar occupies ~15-20% of the left side, showing a collapsible tree. Each level is indented. Files are displayed in a different color/style than folders. Current file is highlighted. Breadcrumb navigation at the top shows the full path (e.g., "My Workspace / APIs / Users API"). Small icons (folder, document) distinguish item types.

---

## 7. Route Documentation Editor (Basic)

Provide a text editor for writing route documentation in the custom syntax, with basic formatting (no highlighting yet).

**User flow**
1. User opens or creates a file
2. Editor loads with empty or existing content
3. User types route documentation in the custom syntax
4. Changes are auto-saved every 2 seconds (debounced)
5. User sees a visual indicator (e.g., "All changes saved")
6. Closing the tab does not lose unsaved changes (due to auto-save)

**UI overview**
Main editor pane occupies the right side. Shows line numbers on the left. Plain monospace font. Auto-save indicator in the top right (e.g., "Saving..." → "All changes saved"). Tab bar shows currently open files with an option to close each. Word count and character count in the footer.

---

## 8. Syntax Highlighting for Route Syntax

Add TypeScript-like syntax highlighting to the route editor, coloring HTTP methods, types, keywords, and comments distinctly.

**User flow**
1. User types in the editor (feature #7)
2. Custom tokenizer scans the text in real time
3. Tokens are highlighted: HTTP methods (GET, POST, etc.) in blue, types in green, comments in gray, etc.
4. Highlighting updates as user types (debounced)
5. User sees color-coded documentation that's easier to read

**UI overview**
No explicit UI — highlighting is automatic in the editor. Route blocks show: method names in one color (e.g., blue), type definitions in another (e.g., green), comment text in gray, plain text in black. Contrast is high for readability. Users can see exactly which parts are recognized as valid syntax.

---

## 9. Route Block Folding/Collapsing

Allow users to fold individual route blocks (between `#` titles) to hide content and navigate large files easily.

**User flow**
1. User sees a route file with multiple route blocks (each starting with `#`)
2. User clicks a fold icon (or arrow) next to the `#` line
3. Route block content is hidden; only the title is visible
4. User can unfold by clicking the arrow again
5. All folds are remembered for that session (or persisted)

**UI overview**
Small arrow/chevron icon to the left of each `#` title line. When collapsed, the arrow points right; when expanded, it points down. Collapsed blocks show ellipsis (…) after the title to indicate hidden content. No special styling needed — standard editor behavior.

---

## 10. Real-Time Collaboration: WebSocket Connection & Session Management

Set up WebSocket infrastructure (via Socket.io on Supabase Realtime) to enable live synchronization between multiple users editing the same file.

**User flow**
1. User opens a file
2. Frontend establishes a WebSocket connection to the collaboration server
3. User is added to a "session" for that file
4. Other users editing the same file are identified
5. When any user makes a change, the server broadcasts it to all other users in the session
6. User sees updates appear in their editor in real time
7. When user closes the file or goes offline, the session ends

**UI overview**
No explicit UI element — collaboration happens silently. User might see a "Connected" indicator in the editor header or a user avatar/presence indicator. In the future (feature #11), users will see other users' cursors.

---

## 11. Real-Time Cursor & Presence Tracking

Display live cursor positions and presence of other users editing the same file, so collaborators know who is editing and where.

**User flow**
1. User opens a file that others are also editing
2. User sees a list of "currently editing" users (e.g., "Alice & Bob")
3. As other users move their cursor or type, live cursor indicators appear in the editor (colored line or avatar)
4. User hovers over a cursor to see the user's name
5. When a user leaves the file, their cursor disappears

**UI overview**
In the editor header or sidebar, show active users as small avatars or names. In the editor itself, show colored vertical line cursors at the exact position where each user is editing. Each user gets a unique color. User names appear on hover. If many users are in the file, show a count (e.g., "5 people editing").

---

## 12. Real-Time Content Synchronization

Ensure that when one user edits content, all other users see the change instantly in their editor (conflict resolution using last-write-wins).

**User flow**
1. User A types at position 50 in the editor
2. User B types at position 100 simultaneously
3. Both changes are sent to the server
4. Server merges changes (no conflict; different positions)
5. Both users see both changes in their editor within ~100ms
6. If both users edit the same position (conflict), the last change to reach the server wins
7. User B's change is overwritten; User B sees a brief highlight/notification that their text was overwritten

**UI overview**
No explicit UI — sync is transparent. If a conflict occurs, affected text might briefly flash red or a toast notification says "Your edit was overwritten; undo to restore." Users can undo if needed.

---

## 13. Search & Filter Within Workspace

Enable users to search by file name and content across their entire workspace, with optional folder filtering.

**User flow**
1. User clicks search icon or presses Cmd+K (or Ctrl+K)
2. Search box opens at the top or in a modal
3. User types a query (e.g., "GET /users")
4. Results appear live: matching file names and matching content snippets
5. User can optionally filter by folder (dropdown)
6. User clicks a result to jump to that file and highlight the match
7. Search is case-insensitive and supports partial matches

**UI overview**
Quick search modal (Cmd+K or Ctrl+K) with a text input and dropdown results. Results show file name, folder path, and a snippet of matching content (with the query highlighted). Optional folder filter dropdown. Results are ranked by relevance (exact name match first, then content matches).

---

## 14. Public Link Generation & Sharing

Allow users to create shareable public links to files or folders that permit read-only access without authentication.

**User flow**
1. User right-clicks a file or folder → "Share"
2. Share modal opens
3. User selects "Public Link" (or toggle it on)
4. System generates a unique token/slug
5. User copies the link (e.g., "routeforge.com/share/abc123")
6. User can optionally add a name/description for the link (optional feature)
7. User shares the link with others
8. Anyone with the link can view the file/folder in read-only mode without logging in
9. User can revoke the link by clicking "Disable" in the share modal

**UI overview**
Share modal shows two sections: "Public Link" and "Team Sharing" (feature #16). For public links, show a toggle, the generated link, a copy button, and optionally a name field. Show a lock/unlock icon to indicate the link's status.

---

## 15. Download File & Folder Exports

Allow users to download files as plain text, Markdown, or JSON, and folders as ZIP archives.

**User flow**
1. User right-clicks a file → "Download" or clicks a download icon in the editor toolbar
2. Format selector appears: "TXT", "MD", or "JSON" (for files) or "ZIP" (for folders)
3. User selects a format
4. System generates the export and downloads it to the user's computer
5. For folders, system recursively zips all contained files and metadata

**UI overview**
Download button in the editor toolbar or file context menu. Simple format selector dropdown. On click, the browser's native download dialog appears. No special UI needed — standard browser download.

---

## 16. Team Member Invitation & Access Control

Allow workspace owners to invite other users to a team, assign them editor or viewer roles, and revoke access.

**User flow**
1. Workspace owner opens "Team" settings
2. Clicks "Invite Member"
3. Enters email address(es) to invite
4. Selects role: "Editor" (read-write) or "Viewer" (read-only)
5. Invitee receives email with a link
6. Invitee clicks link, signs up or logs in, and gains access
7. Workspace owner can revoke member's access by clicking "Remove" in the team list
8. Removed member loses access to all workspace files

**UI overview**
Team settings page (accessible from workspace settings) shows a list of current team members with their email, role, and a "Remove" button. An "Invite Member" button opens a form to enter email(s) and select role(s). Invitations show a "Pending" status until the invitee accepts.

---

## 17. Private Invite Link Generation (Optional in MVP)

Allow users to generate time-limited or unrestricted private links that invite specific users to collaborate with configurable read/write permissions.

**User flow**
1. User right-clicks a file/folder → "Share"
2. In the share modal, selects "Private Link" or "Invite Specific People"
3. Enters email addresses of invited users
4. Selects permission level: "Can View" or "Can Edit"
5. Optionally sets expiration (e.g., "7 days" or "Never")
6. System generates an invite link (or sends email with link)
7. Invitee can access the file with the permissions set
8. If link expires, invitee loses access

**UI overview**
In the share modal, a second section below public links for "Private Sharing". Input field for email(s), role dropdown (Viewer/Editor), expiration dropdown, and a "Generate Link" button. Shows list of active private links with email, role, expiration, and revoke button.

---

## 18. File Metadata & History (Basic)

Display file creation date, last modified date, last modified by, and file size. Optionally, store a basic version history.

**User flow**
1. User right-clicks a file → "Properties" or clicks an info icon
2. Modal shows: creation date, last modified date, last modified by (if team), file size
3. Optionally, user can click "History" to see a list of past edits with timestamps and authors
4. User can select a past version and view it (read-only)
5. User can optionally restore an older version (advanced feature)

**UI overview**
File info modal shows metadata in a simple format (key-value pairs). If history is included, a "History" tab or button shows a timeline of edits with timestamps, author names, and a preview of what changed. Click to view a specific version in read-only mode.

---

## 19. User Account Settings & Security

Allow users to update their profile, change password, manage sessions, and enable/disable two-factor authentication (optional).

**User flow**
1. User clicks account menu (top right) → "Settings"
2. Settings page shows tabs: Profile, Password, Sessions, Security
3. Profile: user can update display name and avatar
4. Password: user can change password (requires current password)
5. Sessions: user can see active sessions and sign out from any device
6. Security: user can enable 2FA (optional MVP feature)
7. Changes are saved immediately or with a "Save" button

**UI overview**
Account settings page with tabs or a sidebar menu. Simple form fields for each setting. Clear confirmation messages after updates (e.g., "Password changed successfully"). Session list shows device name, IP, last active time, and a "Sign Out" button.

---

## 20. Workspace Settings & Management

Allow workspace owners to rename workspace, delete workspace, manage team, adjust default sharing settings, and export workspace data.

**User flow**
1. Workspace owner clicks "Settings" (workspace dropdown or gear icon)
2. Opens workspace settings page
3. Owner can rename workspace, set default sharing (public or private)
4. Owner can delete workspace (requires confirmation)
5. Owner can export entire workspace as ZIP with all files and metadata
6. Owner can see workspace created date and storage usage

**UI overview**
Workspace settings page (separate from user account settings). Shows workspace name with edit button, team management link, default sharing toggle, storage usage bar, export button, and a red "Delete Workspace" button at the bottom. Confirmation dialogs for destructive actions.

---

## 21. Rate Limiting & Security Headers

Implement rate limiting on API endpoints (especially auth and search) and set security headers (CORS, CSP, X-Frame-Options, etc.) to protect against abuse and attacks.

**User flow**
1. Attacker attempts to brute-force login by making 100 requests in 1 minute
2. Server rate-limits after 10 failed attempts, responding with 429 Too Many Requests
3. Attacker is locked out for 15 minutes
4. Browser enforces security headers: CORS prevents cross-origin requests, CSP prevents injection attacks
5. Server sets X-Frame-Options to prevent clickjacking

**UI overview**
No user-facing UI — security is enforced on the backend. Users see rate-limit error ("Too many attempts; please try again in 15 minutes") if they exceed limits.

---

## 22. Error Handling & User Notifications

Provide clear error messages for failed operations (network errors, permission denied, validation errors) and toast notifications for successes.

**User flow**
1. User attempts to create a file with an invalid name (e.g., empty)
2. Form validation prevents submission; error message appears below the field
3. User tries to download a file but loses internet connection
4. Error toast appears: "Download failed; check your connection"
5. User deletes a file; success toast appears: "File deleted"
6. User attempts to access someone else's workspace
7. Error page shows: "Access denied; you don't have permission to view this workspace"

**UI overview**
Inline validation errors below form fields (red text). Toast notifications for temporary messages (success, error, warning) appearing at bottom right and auto-dismissing after 3-5 seconds. Full-page error pages for critical errors (404, 403, 500) with helpful messages and links to return home.

---

## 23. Deployment & Infrastructure (Supabase)

Configure and deploy the application to production using Supabase (PostgreSQL, Auth, Realtime) for backend, Nuxt on Vercel or self-hosted Node.js for frontend, and optional CDN for static assets.

**User flow**
1. Developer sets up Supabase project (PostgreSQL, Auth enabled)
2. Runs migrations to create database schema
3. Sets environment variables (Supabase URL, API key, etc.)
4. Deploys Nuxt frontend to Vercel (or self-hosted)
5. Configures Supabase Auth with redirect URLs
6. Tests sign-up, login, file creation end-to-end in production
7. Monitors application metrics (uptime, response time, error rate)

**UI overview**
No user-facing UI — deployment is infrastructure. In development, team accesses admin dashboard: Supabase console for database, Auth, Realtime; Vercel dashboard for deployment logs and metrics.

---

## 24. Analytics & Monitoring (Optional)

Track user signup, login, file creation, sharing, and collaboration events. Monitor API response times, error rates, and resource usage.

**User flow**
1. System logs events: user_signup, user_login, file_created, file_shared, collaboration_start, collaboration_end
2. Analytics dashboard shows daily active users, new signups, most-edited files, average file size
3. Error monitoring tool (e.g., Sentry) captures backend errors and sends alerts
4. Admin can see performance metrics: API latency, database query times, WebSocket connection health

**UI overview**
Admin dashboard (not accessible to regular users) shows graphs and tables: DAU, signup trends, top files, error logs. Simple line charts for trends, tables for detailed logs.
