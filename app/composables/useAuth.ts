export const useAuth = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()

  const login = async () => {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) console.error('Login error:', error)
  }

  const logout = async () => {
    const { error } = await client.auth.signOut()
    if (error) console.error('Logout error:', error)
    await router.push('/')
  }

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const { data } = await client.auth.getSession()
      return !!data?.session?.user
    } catch (err) {
      console.error('checkAuthStatus error:', err)
      return false
    }
  }

  // Resolves public.users.id from auth.users.id
  const getPublicUserId = async (): Promise<string | null> => {
    if (!user.value?.id) return null
    const { data } = await client
      .from('users')
      .select('id')
      .eq('auth_id', user.value.id)
      .single()
    return data?.id ?? null
  }

  const getFirstWorkspace = async () => {
    try {
      const publicUserId = await getPublicUserId()
      if (!publicUserId) return null

      const { data, error } = await client
        .from('workspaces')
        .select('id, name, description')
        .eq('owner_id', publicUserId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }
      return data
    } catch (err) {
      console.error('getFirstWorkspace error:', err)
      return null
    }
  }

  const getUserWorkspaces = async () => {
    try {
      const publicUserId = await getPublicUserId()
      if (!publicUserId) return []

      const { data, error } = await client
        .from('workspaces')
        .select('id, name, description, owner_id')
        .eq('owner_id', publicUserId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('getUserWorkspaces error:', err)
      return []
    }
  }

  const getProfile = async () => {
    try {
      if (!user.value?.id) return null

      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('auth_id', user.value.id)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('getProfile error:', err)
      return null
    }
  }

  return {
    user: readonly(user),
    login,
    logout,
    checkAuthStatus,
    getFirstWorkspace,
    getUserWorkspaces,
    getProfile
  }
}
