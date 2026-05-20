<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Autenticando...'
})

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref<string | null>(null)
const statusMessage = ref('Processando autenticação...')

onMounted(async () => {
  try {
    statusMessage.value = 'Verificando...'

    // @nuxtjs/supabase handles the token exchange from the magic link automatically.
    // Wait for the session to be established, then redirect.
    const user = useSupabaseUser()
    const maxWait = 10000
    const start = Date.now()
    while (!user.value && Date.now() - start < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    const next = route.query.next as string | undefined
    statusMessage.value = next ? 'Redirecionando...' : 'Carregando seu workspace...'

    await router.replace(next || '/workspace')
  } catch (err: any) {
    console.error('Callback error:', err)
    loading.value = false
    error.value = err.data?.statusMessage || err.message || 'Erro ao processar autenticação'
    statusMessage.value = 'Erro na autenticação'
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center space-y-4">
      <div v-if="loading" class="mb-4">
        <UIcon name="i-eos-icons:loading" class="w-8 h-8 mx-auto animate-spin text-blue-500" />
      </div>

      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ statusMessage }}
      </h1>

      <p v-if="loading" class="text-gray-600 dark:text-gray-400">
        Você será redirecionado em breve...
      </p>

      <div v-if="error" class="mt-4 max-w-sm mx-auto">
        <UAlert
          icon="i-heroicons-exclamation-triangle-20-solid"
          color="red"
          title="Erro de Autenticação"
          :description="error"
          class="mb-4"
        />
        <UButton
          to="/"
          color="white"
          icon="i-heroicons-arrow-left"
        >
          Voltar para Login
        </UButton>
      </div>
    </div>
  </div>
</template>
