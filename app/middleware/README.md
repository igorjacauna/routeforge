# Route Middleware

## `auth.client.ts`

Client-side middleware for handling authentication-based routing.

### Behavior

Automatically manages route access based on authentication status:

| Route | Authenticated | Unauthenticated |
|-------|---------------|-----------------|
| `/` (login) | → `/workspace` | ✅ Allowed |
| `/auth/*` (callback) | → `/workspace` | ✅ Allowed |
| `/workspace/*` | ✅ Allowed | → `/` |

### Usage

Add to pages that need auth protection:

```typescript
definePageMeta({
  middleware: 'auth'
})
```

### Implementation Notes

- **File:** `auth.client.ts` (`.client` suffix = client-only execution)
- **Trigger:** Before each route navigation
- **Check:** `useSupabaseUser()` - Reactive user state from Supabase session
- **Redirect:** Uses `navigateTo()` for smooth transitions

### Examples

**Login Page (redirect if authenticated):**
```typescript
// app/pages/index.vue
definePageMeta({
  middleware: 'auth'  // Redirects to /workspace if logged in
})
```

**Protected Page (redirect if unauthenticated):**
```typescript
// app/pages/workspace/[id].vue
definePageMeta({
  middleware: 'auth'  // Redirects to / if not logged in
})
```

**Callback Page (requires auth, redirect if already logged in):**
```typescript
// app/pages/auth/callback.vue
definePageMeta({
  middleware: 'auth'  // Protection + redirect if already authenticated
})
```

### How it Works

1. **User navigates to route**
   ↓
2. **Middleware runs before page renders**
   ↓
3. **Checks authentication status via `useSupabaseUser()`**
   ↓
4. **Applies redirect logic:**
   - Auth pages + authenticated → `/workspace`
   - Protected pages + unauthenticated → `/`
   - Otherwise → page loads normally
   ↓
5. **Page renders**

### Security Notes

- ✅ Uses reactive Supabase session (real-time updates)
- ✅ Prevents authenticated users from seeing login pages
- ✅ Prevents unauthenticated users from accessing workspace
- ✅ Works alongside server-side auth middleware (`app/server/middleware/auth.ts`)

### Future Enhancements

- Add role-based access control (viewer/editor)
- Add workspace ownership checks
- Add team member validation
- Support for public share links (bypass auth)
