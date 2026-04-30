import { db } from '../db'

export default defineEventHandler(async (event) => {
  // Skip auth check for public routes
  const publicRoutes = ['/', '/auth/callback', '/auth/google']
  if (publicRoutes.includes(event.node.req.url || '')) {
    return
  }

  // Only check auth for /api/* routes
  if (!event.node.req.url?.startsWith('/api')) {
    return
  }

  const token = getCookie(event, 'sb-access-token')

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await db.auth.getUser(token)

    if (error || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid token'
      })
    }

    // Store user in event context for later use
    event.context.user = user
  } catch (err) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
})
