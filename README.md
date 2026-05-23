# RouteForge

API route documentation editor with real-time collaboration.

## Features

- **Email magic link login** — passwordless auth via Supabase + Resend
- **Real-time collaboration** — multiple users editing the same file simultaneously (Hocuspocus + Yjs)
- **Syntax highlighting** — TypeScript-like syntax highlighting for API route definitions
- **File explorer** — hierarchical tree with drag-and-drop, context menus, breadcrumb navigation
- **Workspace management** — multiple workspaces, team member invitations, role-based access
- **Auto-save** — debounced saving with status indicator

## Stack

- **Frontend:** Nuxt 4 + Nuxt UI v4 + Tailwind CSS 4
- **Editor:** CodeMirror 6
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Collaboration:** Hocuspocus + Yjs
- **Email:** Resend

## Quick Start

```bash
pnpm install
cp .env.example .env
# Fill in Supabase URL, anon key, and service key
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
├── pages/         # File-based routing
├── components/    # Vue components
├── composables/   # Shared logic (useAuth, useFiles, useCollaboration, etc.)
├── middleware/     # Client-side route protection
└── layouts/       # Auth and default layouts

server/
├── api/           # REST endpoints
├── extensions/    # Hocuspocus WebSocket server
├── middleware/     # Server-side auth guard
├── utils/         # Shared server utilities
└── routes/        # Custom route handlers

supabase/
└── migrations/    # Database schema migrations
```

## Documentation

- [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) — Auth system details
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) — Full implementation overview
- [features.md](./features.md) — Feature list and user flows
- [spec.md](./spec.md) — Product specification
- [techspec.md](./techspec.md) — Technical architecture

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm preview      # Preview production build
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
pnpm migrate      # Run database migrations
```

## License

MIT
