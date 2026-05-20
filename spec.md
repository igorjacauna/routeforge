# RouteForge — Specification

> **Context:** This spec formalizes a notebook-style documentation tool for API routes. The platform enables developers to write, organize, and share route documentation with syntax highlighting similar to TypeScript, supporting both individual developers and development teams. Built with Nuxt and Nuxt UI for a modern, accessible interface.

## Overview

RouteForge is a workspace-based notebook for documenting API routes and endpoints. Users write route documentation in a custom syntax (with TypeScript-like highlighting), organize files and folders like a traditional file explorer, and share documentation via shareable links with granular access control. The tool supports real-time team collaboration, allowing multiple users to edit shared documents simultaneously. It is not a general-purpose note-taking app, API testing tool, or backend server — it is documentation-first, designed specifically for route declaration and specification.

---

## Goals

- Enable developers to document APIs quickly with clear, type-safe syntax highlighting
- Support both individual and team workflows with zero friction switching between the two
- Allow selective sharing of route documentation (public links, private sharing, restricted access) without exposing the entire workspace
- Provide a collaborative editing experience so teams can work on route docs together in real time
- Offer straightforward file/folder organization mirroring how developers think about their projects

---

## User Roles

### Individual Developer
- Can create a personal workspace and author route documentation in private
- Can create shareable public links to route files/folders (read-only)
- Can generate downloadable exports of route documentation (single file or folder)
- Cannot invite other users; all sharing is via public links or file downloads
- Authenticates via email magic link

### Team Member
- Can create a workspace and invite other users to a team/workspace
- Can edit files and folders collaboratively in real time with invited team members
- Can create public links (read-only) for external sharing of specific routes
- Can create private invite links that allow invited users to edit (if sharing permissions are set to read-write)
- Sees team member cursors and presence in the editor
- Authenticates via email magic link

### Public Link Visitor (Unauthenticated)
- Can view route documentation via public read-only links
- Can download route documentation as a file if the link permits it
- Cannot edit, create, or modify any content
- No authentication required

---

## Core Features

### 1. Workspace & File Organization

Users have a personal workspace that functions as a file explorer. They can:
- Create, rename, and delete folders and files
- Nest folders arbitrarily deep
- Move files and folders via drag-and-drop
- See a sidebar or tree view of the workspace structure
- Each file is a route documentation "notebook" containing one or more route blocks

The workspace persists across sessions and is user-specific. Workspaces are private by default; sharing is explicit (via feature #3 below).

### 2. Route Documentation Editor

The editor supports a custom syntax for documenting API routes. Each route block is headed by a `# Title` marker and is independently foldable.

**Syntax:**
```
# Route Title
/**
 * Description of the route
 */
GET /api/users?page=<number>&limit=<number>
Authorization: Bearer <token>

Request {
  title: string,
  tags: string[]
}

Response {
  id: number,
  name: string,
  email: string
}

# Another Route
POST /api/users
...
```

**Features:**
- Syntax highlighting similar to TypeScript (types in angle brackets or curly braces are color-coded)
- Comments support `//`, `/* */`, and `#` styles
- Each route block (between `#` markers) is independently foldable/collapsible
- Line numbering for reference
- Auto-save as the user types (debounced)
- Clear visual separation between route blocks

### 3. Sharing & Access Control

Users can share files or folders via links with granular control:

**Public Links (Read-Only):**
- Generate a shareable link to a file or folder
- Link is publicly accessible; no authentication required
- Viewers can read the route documentation and optionally download it as a file
- No editing is possible

**Private Invite Links (Read-Write):**
- Generate a shareable link valid for a specific team or set of users
- Link can permit editing (read-write) or viewing only (read-only) depending on the sharing setting
- User receives an invite link, clicks it, and gains access
- Access is tied to the link; user does not need an account to access shared content
- User must still authenticate if they want to create their own workspace

**Team Sharing:**
- Team members invited to the workspace can edit and view all files (unless folder-level permissions are set)
- Team member can be invited with editor or viewer role
- Owner can revoke team member access at any time

**Download:**
- Users can download a file as `.txt`, `.md`, or `.json`
- Folders can be downloaded as a `.zip` containing all nested files
- Public link viewers can download if the link permits it

### 4. Real-Time Collaboration

When multiple team members edit the same file simultaneously:
- Changes are synchronized in real time (or near real time)
- Each user sees a cursor indicator showing where others are editing
- User presence is shown (online/offline status)
- Conflict resolution: last-write-wins; if simultaneous edits overlap, the most recent change is preserved
- User can see who is currently viewing/editing a file

### 5. Authentication & Authorization

**Sign-Up/Login:**
- Email magic link (passwordless)
- Sessions persist across browser restarts (HTTP-only cookies)
- First-time users: workspace auto-created on first magic link login

**Authorization:**
- Users own their workspace and can only edit their own files unless explicitly shared
- Shared files respect the access control set at sharing time (read-only, read-write, or team-only)
- Public links have no auth requirement but are read-only by design
- API routes require authentication on all mutating endpoints; read endpoints for shared/public content may be unauthenticated

### 6. Search & Discovery

Users can search within their workspace:
- Full-text search across file names and route documentation content
- Filter by folder or file type (route file vs. folder)
- Keyboard shortcut (e.g., `Cmd+K` or `Ctrl+K`) to open quick search
- No global "discover public routes" feature; discovery is only via shared links users provide to each other

### 7. File Metadata & History

Each file tracks:
- Creation date and last modified date
- Last modified by (username)
- File size
- Optional: version history (snapshots of previous edits) — *team to decide if in MVP*

---

## Technical Stack

- **Frontend** — Nuxt 4 (latest stable) + Nuxt UI for components
- **Editor** — CodeMirror (with custom tokenizer for route syntax)
- **Real-Time Sync** — WebSocket (Socket.io) with Upstash Redis pub/sub
- **Backend** — Nitro (Nuxt's server framework) with PostgreSQL database
- **Authentication** — Supabase Auth with email magic link
- **Cache/Sessions** — Upstash Redis (serverless, no infra)
- **Styling** — Tailwind CSS (Nuxt UI default) + custom Nuxt UI theme
- **Deployment** — Railway.app (recommended) or self-hosted (DigitalOcean $5/month VPS)

---

## Assumptions & Decisions

1. **Authentication:** Email magic link (passwordless). Simplifies auth flow and reduces account recovery overhead.
2. **Real-Time Sync:** WebSocket via Socket.io + Upstash Redis for simplicity; team may switch to alternatives (y-js, Automerge) if advanced conflict resolution is needed later.
3. **Storage:** Backend uses PostgreSQL for user, workspace, and file metadata; actual file content stored as text in the database. Upstash Redis stores ephemeral session data (who's editing, cursor positions).
4. **Syntax Highlighting:** Custom tokenizer for route syntax using a simple lexer; not using a full language parser (WASM-based) to keep bundle size lean.
5. **Collaboration Scope:** MVP supports simultaneous editing; no advanced features like comments, suggestions, or branching in Phase 1.
6. **Deployment:** Railway.app recommended due to built-in DDoS protection, predictable costs, and spending caps (prevents runaway bills unlike Vercel).
7. **No Versioning in MVP:** File history is out of scope for the initial release; can be added based on feedback.
