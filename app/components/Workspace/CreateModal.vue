<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Too short'),
});

const emit = defineEmits<{
  (e: 'submit', event: FormSubmitEvent<z.infer<typeof schema>>): void;
}>();

const open = defineModel<boolean>({
  default: false,
});

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined,
});

async function onSubmit(event: FormSubmitEvent<Schema>) {
  emit('submit', event);
}
</script>

<template>
  <UModal v-model:open="open" title="New workspace" description="Add a new workspace">
    <UButton label="New workspace" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" placeholder="My workspace" name="name">
          <UInput v-model="state.name" class="w-full" />
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