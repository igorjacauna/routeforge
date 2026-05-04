import { Hocuspocus, type Extension } from '@hocuspocus/server'
import { Database } from '@hocuspocus/extension-database'
import { Redis } from '@hocuspocus/extension-redis'
import * as Y from 'yjs'
import { db as supabaseAdmin } from '../utils/db'

async function resolvePublicUserId(authId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('users').select('id').eq('auth_id', authId).single()
  return data?.id ?? null
}

async function canAccessFile(publicUserId: string, fileId: string): Promise<boolean> {
  const { data: file } = await supabaseAdmin
    .from('files').select('workspace_id').eq('id', fileId).single()
  if (!file) return false

  const { data: workspace } = await supabaseAdmin
    .from('workspaces').select('id')
    .eq('id', file.workspace_id).eq('owner_id', publicUserId).single()
  if (workspace) return true

  const { data: member } = await supabaseAdmin
    .from('team_members').select('id')
    .eq('workspace_id', file.workspace_id)
    .eq('user_id', publicUserId)
    .eq('status', 'accepted').single()
  return !!member
}

const extensions: Extension[] = [
  new Database({
    fetch: async ({ documentName: fileId }) => {
      const { data } = await supabaseAdmin
        .from('files').select('collab_state, content').eq('id', fileId).single()

      if (data?.collab_state) {
        return Buffer.from(data.collab_state, 'base64')
      }

      // First collab session — bootstrap Yjs doc from plain text content
      if (data?.content) {
        const ydoc = new Y.Doc()
        ydoc.getText('content').insert(0, data.content)
        const state = Y.encodeStateAsUpdate(ydoc)
        await supabaseAdmin.from('files').update({
          collab_state: Buffer.from(state).toString('base64'),
        }).eq('id', fileId)
        return state
      }

      return null
    },

    store: async ({ documentName: fileId, document }) => {
      const state = Y.encodeStateAsUpdate(document)
      await supabaseAdmin.from('files').update({
        collab_state: Buffer.from(state).toString('base64'),
        content: document.getText('content').toString(),
        updated_at: new Date().toISOString(),
      }).eq('id', fileId)
    },
  }),
]

// Redis for pub/sub between Cloud Run instances — only when configured
if (process.env.UPSTASH_REDIS_HOST && process.env.UPSTASH_REDIS_PASSWORD) {
  extensions.unshift(new Redis({
    identifier: 'routeforge',
    host: process.env.UPSTASH_REDIS_HOST,
    port: 6379,
    options: {
      password: process.env.UPSTASH_REDIS_PASSWORD,
      tls: { rejectUnauthorized: false },
    },
  }))
}

export const hocuspocus = new Hocuspocus({
  extensions,
  debounce: 500,
  quiet: true,

  async onAuthenticate({ token, documentName: fileId }) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) throw new Error('Unauthorized')

    const publicUserId = await resolvePublicUserId(user.id)
    if (!publicUserId) throw new Error('User not found')

    const hasAccess = await canAccessFile(publicUserId, fileId)
    if (!hasAccess) throw new Error('Access denied')

    return { userId: publicUserId, email: user.email }
  },
})
