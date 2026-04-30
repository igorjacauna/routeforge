import { db } from '~/server/db'

export default defineEventHandler(async (event) => {
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getRequestURL(event).origin}/auth/callback`
    }
  })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  if (!data.url) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate OAuth URL'
    })
  }

  // Redirect to Google OAuth
  return sendRedirect(event, data.url)
})
