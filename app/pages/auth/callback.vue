<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'auth'
})

useSeoMeta({
  title: 'Autenticando...'
})

const router = useRouter()

const loading = ref(true)
const error = ref<string | null>(null)
const statusMessage = ref('Processando autenticação...')

onMounted(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 800))

    statusMessage.value = 'Carregando seu workspace...'

    const { workspace } = await $fetch('/api/workspaces/ensure', { method: 'POST' })

    if (!workspace) {
      throw new Error('Não foi possível criar o workspace.')
    }

    await router.replace(`/workspace/${workspace.id}`)
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
