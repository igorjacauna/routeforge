# Auth Implementation — Magic Link (OTP)

## Implementado

### 1. Composable `useAuth.ts`

- `login(email)` — envia magic link via `signInWithOtp`
- `logout()` — encerra sessão e redireciona para `/`
- `checkAuthStatus()` — verifica se há sessão ativa
- `getFirstWorkspace()` — busca primeira workspace do usuário
- `getUserWorkspaces()` — lista todos os workspaces
- `getProfile()` — busca perfil completo
- `getPublicUserId()` — resolve `public.users.id` a partir do `auth.users.id`
- `user` exportado como `readonly()` para reatividade segura

**Localização:** `app/composables/useAuth.ts`

### 2. Página de Login `/`

- Input de email com validação client-side
- Botão "Send magic link"
- Tela de confirmação "Check your email" após envio
- Opção de voltar e trocar o email
- Tratamento de erros inline
- Middleware `auth` + layout `auth`

**Localização:** `app/pages/index.vue`

### 3. Página de Callback `/auth/callback`

- Polling por `useSupabaseUser()` até sessão ser estabelecida
- Redirecionamento automático para `/workspace` ou rota `next`
- Loading state com ícone animado
- Tratamento de erros com alerta e botão de voltar
- Middleware `auth` + layout `auth`

**Localização:** `app/pages/auth/callback.vue`

### 4. Proteção de Rotas

- `app/middleware/auth.ts` — redireciona usuários autenticados para `/workspace` e não-autenticados para `/`
- `server/middleware/auth.ts` — retorna 401 para requisições não autenticadas em `/api/*`

### 5. Endpoints de API

- `/api/auth/profile.get.ts` — perfil + workspaces do usuário
- `/api/workspaces/first.get.ts` — primeira workspace
- `/api/workspaces/index.get.ts` — lista todos os workspaces
- `/api/workspaces/ensure.post.ts` — garante que usuário tem workspace

### 6. Database Trigger

- `handle_new_user()` — cria automaticamente registro em `public.users` + workspace "My Workspace" no primeiro login
- Fallback: quando `full_name` não existe (usuário OTP), usa prefixo do email como `display_name`

**Localização:** `supabase/migrations/007_otp_auth_fallback.sql`

---

## Fluxo de Autenticação

```
1. Usuário acessa /
   ↓
2. Digita email e clica "Send magic link"
   ↓
3. useAuth.login(email) chama signInWithOtp
   ↓
4. Supabase envia email com magic link (via Resend SMTP)
   ↓
5. Usuário clica no link do email
   ↓
6. @nuxtjs/supabase intercepta automaticamente:
   - Extrai access_token do hash da URL
   - Seta a sessão (JWT em cookie HTTP-only)
   - Redireciona para /auth/callback
   ↓
7. /auth/callback monta, aguarda sessão, redireciona para /workspace
   ↓
8. SQL Trigger (primeira vez): cria users + workspace
```

---

## Segurança

- JWT em cookies HTTP-only (não acessível via JavaScript)
- Middleware de autenticação em todas as rotas `/api`
- Service role key apenas no servidor
- Anon key apenas no cliente
- Middleware protege rotas de auth e workspace
- Validação de user ID antes de queries

---

## Variáveis de Ambiente

```env
# Supabase
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-key
NUXT_SUPABASE_SECRET_KEY=your-service-role-key
```

**Configurar em:**
1. `.env.local` (desenvolvimento)
2. Supabase Dashboard > Project Settings > API

---

## Configuração no Supabase

### 1. Email Provider (Magic Link)

**Supabase Dashboard > Authentication > Providers > Email**
- Enable email provider: ✅
- Configure SMTP (recomendado usar Resend):
  - SMTP Host: `smtp.resend.com`
  - Port: `465`
  - Username: `resend`
  - Password: sua API key do Resend

### 2. Redirect URLs

**Supabase Dashboard > Authentication > URL Configuration**
- Site URL: `http://localhost:3000` (dev) ou `https://seu-dominio.com` (prod)
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://seu-dominio.com/auth/callback`

### 3. RLS Policies (Recomendado)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

-- Users can view own workspaces
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM users WHERE id = owner_id));

-- System can create users (for trigger)
CREATE POLICY "System can create users" ON users
  FOR INSERT WITH CHECK (true);
```

---

## Testes

### Primeiro acesso (sem sessão)
1. Abrir aba anônima
2. Acessar `localhost:3000`
3. Digitar email e clicar "Send magic link"
4. Ver tela "Check your email"
5. Clicar no link do email
6. Ser redirecionado para `/workspace`

### Já logado
1. Acessar `/`
2. Middleware redireciona para `/workspace`

### Email inválido
1. Digitar email sem `@`
2. Ver mensagem de erro "Enter a valid email address"

### Link expirado ou inválido
1. Callback mostra erro com alerta e botão "Voltar para Login"

---

## Troubleshooting

### "Blank page at /auth/callback"
- Verificar se `@nuxtjs/supabase` está instalado
- Verificar `nuxt.config.ts` tem `callback: '/auth/callback'`
- Verificar console para erros de sessão

### "Redireciona para / em vez de /workspace"
- Workspace não foi criada pelo trigger
- Verificar se trigger `handle_new_user()` existe no banco
- Verificar logs do Supabase

### "Erro 401 Unauthorized em /api/*"
- JWT token não está sendo passado
- Cookies HTTP-only não estão sendo enviados
- Verificar `useSsrCookies: true` no `nuxt.config.ts`

### Magic link não chega no email
- Verificar configuração SMTP no Supabase
- Verificar se o email não foi para spam
- Verificar logs do Supabase Auth

---

**Status:** Implementado
**Versão:** Nuxt 4.4.2 + @nuxtjs/supabase 2.0.6
