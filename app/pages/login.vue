<script setup lang="ts">
import useAuth from '~/composables/auth';

const toast = useToast();
const { signInWithGoogle } = useAuth();
const loading = ref(false);
const router = useRouter();

const providers = [{
  label: 'Google',
  icon: 'i-simple-icons-google',
  onClick: () => {
    loading.value = true;
    signInWithGoogle().catch((reason) => {
      toast.add({
        title: 'Error on login',
        description: reason.message,
        color: 'error',
      });
    }).then(() => {
      router.replace('/');
    }).finally(() => {
      loading.value = false;
    });
  },
}];
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 w-full">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        :loading
        :providers
        title="Login"
        description="Enter your credentials to access your account."
        icon="i-lucide-user"
      />
    </UPageCard>
  </div>
</template>

