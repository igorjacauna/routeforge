export default defineRouteMiddleware((to, from) => {
  const { $pinia } = useNuxtApp()
  const user = useSupabaseUser()

  // Se o usuário está autenticado, redireciona para workspace
  if (user.value) {
    return navigateTo('/workspace')
  }
})
