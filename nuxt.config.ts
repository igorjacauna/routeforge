// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  ssr: false,
  app: {
    head: {
      title: 'RouteForge',
      meta: [
        { name: 'description', content: 'RouteForge - Your API Contract Editor' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  nitro: {
    preset: 'firebase-app-hosting',
  },
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxt/ui', 'nuxt-vuefire'],
  css: ['~/assets/css/main.css'],
  vuefire: {
    config: JSON.parse(process.env.FIREBASE_CONFIG || '{}'),
    auth: {
      enabled: true,
    },
    appCheck: {
      isTokenAutoRefreshEnabled: true,
      provider: 'ReCaptchaEnterprise',
      key: process.env.RECAPTCHA_SITE_KEY || '',
    },
  },
});