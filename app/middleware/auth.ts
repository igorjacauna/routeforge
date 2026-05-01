/**
 * Client-side auth middleware
 * Handles authentication checks and redirects
 */
export default defineRouteMiddleware((to, from) => {
  const user = useSupabaseUser()

  // Redirect authenticated users away from auth pages
  if (user.value && isAuthPage(to.path)) {
    return navigateTo('/workspace')
  }

  // Redirect unauthenticated users away from protected pages
  if (!user.value && isProtectedPage(to.path)) {
    return navigateTo('/')
  }
})

function isAuthPage(path: string): boolean {
  return path === '/' || path.startsWith('/auth/')
}

function isProtectedPage(path: string): boolean {
  return path.startsWith('/workspace')
}
