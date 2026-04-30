import { ref } from 'vue'

const user = ref(null)
const isLoading = ref(false)

export const useAuth = () => {
  const { signOut } = useSupabaseAuthClient()
  const router = useRouter()

  const login = async () => {
    try {
      isLoading.value = true
      // Redirect to Google OAuth endpoint
      window.location.href = '/api/auth/google'
    } catch (err) {
      console.error('Login error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    try {
      isLoading.value = true
      await signOut()
      user.value = null
      await router.push('/')
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const getUser = async () => {
    try {
      const { data: { user: currentUser } } = await useSupabaseAuthClient().auth.getUser()
      user.value = currentUser
      return currentUser
    } catch (err) {
      console.error('Get user error:', err)
      return null
    }
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    login,
    logout,
    getUser
  }
}
