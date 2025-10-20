export default defineNuxtRouteMiddleware(async (to) => {
  const user = await getCurrentUser();

  // redirect the user to the login page
  if (!user && to.path !== '/login') {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath,
      },
    });
  }
});