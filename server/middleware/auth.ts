import { serverSupabaseUser } from '~~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes
  const publicRoutes = ['/', '/auth/callback']
  if (publicRoutes.includes(event.node.req.url || '')) {
    return
  }

  // Only check auth for /api/* routes
  if (!event.node.req.url?.startsWith('/api')) {
    return
  }

  // Get user from Supabase context (automatically set by @nuxtjs/supabase)
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Store user in event context for API routes to access
  event.context.user = user
})
