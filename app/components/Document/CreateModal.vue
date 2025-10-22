<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';

const schema = z.object({
  title: z.string().min(2, 'Too short'),
});

const emit = defineEmits<{
  (e: 'submit', event: FormSubmitEvent<z.infer<typeof schema>>): void;
}>();

const open = ref(false);

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  title: undefined,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event);
}
</script>

<template>
  <UModal v-model:open="open" title="New document" description="Add a new document to the project">
    <UButton label="New document" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Document title" placeholder="My document" name="title">
          <UInput v-model="state.title" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>