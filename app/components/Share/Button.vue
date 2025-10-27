<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import z from 'zod';

const schema = z.object({
  emails: z.string()
    .min(1, 'Type at least one email')
    .refine(
      (value) => {
        const emails = value.split(',').map(e => e.trim()).filter(e => e);
        return emails.every(email => z.string().email().safeParse(email).success);
      },
      { message: 'There are one or more invalid emails' },
    ),
});

type Schema = z.infer<typeof schema>;

const state = reactive<Schema>({
  emails: '',
});

const toast = useToast();
async function onSubmit(event: FormSubmitEvent<Schema>) {
  // Transforma a string em array após validação
  const emailArray = event.data.emails.split(',').map(e => e.trim()).filter(e => e);
  toast.add({ title: 'Success', description: `${emailArray.length} email(s) válido(s)`, color: 'success' });
  // eslint-disable-next-line no-console
  console.log('Emails:', emailArray);
}
</script>
<template>
  <UPopover>
    <UButton icon="i-lucide-share" variant="ghost" class="ml-2">Share</UButton>

    <template #content>
      <UCard class="w-[400px]">
        <UForm :schema="schema" :state="state" class="mb-4" @submit="onSubmit">
          <UFormField label="Emails" name="emails">
            <UFieldGroup class="w-full">
              <UInput
                v-model="state.emails"
                placeholder="Separated by comma"
                autocomplete="off"
                data-lpignore="true"
                data-form-type="other"
              />
              <UButton type="submit" :disabled="state.emails === undefined">Share</UButton>
            </UFieldGroup>
          </UFormField>
        </UForm>

        <UFieldGroup class="w-full">
          <UInput color="neutral" variant="outline" value="public url" readonly />
          <UButton color="neutral" variant="subtle" icon="i-lucide-clipboard" />
        </UFieldGroup>
      </UCard>
    </template>
  </UPopover>
</template>