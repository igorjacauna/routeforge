# Deployment Options Comparison

## Free Tier Analysis (MVP Requirements)

### Firebase App Hosting ✅ RECOMMENDED
- **Free tier**: 180 minutos/dia de CPU (Cloud Run under the hood)
- **Suficiente para**: ~100 DAU com traffic normal
- **Escalabilidade**: Automática; paga conforme cresce
- **CORS/Security**: Built-in Cloud Run security
- **WebSocket**: ✅ Suportado nativamente
- **Integração**: Google OAuth nativo via Firebase Auth (Supabase Auth também funciona)
- **Deploy**: `firebase deploy` one-command
- **Cold starts**: ~3-5s (Cloud Run default)
- **Custo ao escalar**: $0.40 por 1M requests (muito razoável)

**Vantagens:**
- Free tier real (180 min/dia é ~$10-20 em uso pago)
- Você já usa Firebase em outros projetos
- Google OAuth é nativo
- Não há risk de charges inesperadas (bem definido)
- Deploy super fácil (integrado com `firebase-tools`)

**Desvantagens:**
- Cold starts podem afetar primeira requisição
- Não tem spending cap (mas é previsível)

---

### Vercel (Free Tier)
- **Free**: Unlimited deployments, 100GB bandwidth/mês
- **Suficiente para**: ~200 DAU
- **WebSocket**: ❌ Apenas no plano pago ($20/mês)
- **Preocupação**: Bots/crawlers podem consumir bandwidth rapidamente

**Sua preocupação é válida**: Há relatos de custos inesperados com bots crawling (especialmente links públicos em `routeforge.com/share/...`).

---

### Render (Free Tier)
- **Free**: 750 horas/mês (≈50% uptime) + auto-spin down after 15min inatividade
- **Suficiente para**: MVP com downtime aceitável
- **WebSocket**: ✅ Suportado
- **Problema**: Auto-spin down causa 10-30s delay na primeira requisição
- **Custo ao escalar**: $7/mês por dyno

**Não ideal** para app com real-time collaboration (WebSocket spin-up é slow).

---

### DigitalOcean App Platform ($5/mês)
- **Pago**: $5 fixo (não free)
- **Uptime**: 24/7
- **WebSocket**: ✅ Nativo
- **Escalabilidade**: Manual scaling ($5 por container)
- **Custo previsível**: Melhor para long-term

---

### Self-Hosted VPS ($5–10/mês)
- **DigitalOcean / Linode**: $5 droplet
- **Setup**: Docker + manual SSL
- **Controle total**: Mas requires DevOps knowledge
- **Uptime**: Você é responsável

---

## Recommendation: Firebase App Hosting

### Por que escolher?

1. **Free real**: 180 min/dia é suficiente para MVP
2. **Você já sabe Firebase**: Integração suave
3. **Google OAuth**: Nativo via Firebase Auth ou Supabase Auth
4. **Segurança**: Cloud Run tem proteção contra bots por padrão
5. **Escalável**: Paga conforme cresce ($0.40/1M requests)
6. **Sem surpresas**: Custo é transparente e capped por recursos

### Setup Firebase App Hosting

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Initialize Firebase project
firebase init hosting

# 3. Set up App Hosting (in Firebase console)
# - Create App Hosting resource
# - Connect your GitHub repo
# - Set environment variables

# 4. Deploy manually (for testing)
npm run build
firebase deploy --only hosting

# 5. Set up CI/CD (GitHub Actions)
# Firebase App Hosting auto-deploys on git push
```

### Environment Variables (Firebase Console)

```
NUXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=<key>
NUXT_SUPABASE_SERVICE_ROLE_KEY=<key>
NUXT_PUBLIC_GOOGLE_CLIENT_ID=<google_oauth>
GOOGLE_CLIENT_SECRET=<google_oauth>
UPSTASH_REDIS_REST_URL=<upstash>
UPSTASH_REDIS_REST_TOKEN=<upstash>
```

### Cold Start Mitigation

If 3-5s cold start is unacceptable:
- Use Cloud Scheduler to "warm up" the function every 10 minutes
- Or upgrade to Firebase Blaze plan ($25/month) for "Always On"

---

## Cost Projections

### MVP Phase (0–1000 DAU)
| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Firebase App Hosting | **$0–5** | Free tier + minimal requests |
| Supabase PostgreSQL | **$0** | 500 MB free |
| Upstash Redis | **$0–5** | 10k commands/day free |
| **Total** | **$0–10** | Completely predictable |

### Growth Phase (1000–10k DAU)
| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| Firebase App Hosting | **$20–50** | $0.40 per 1M requests |
| Supabase PostgreSQL | **$25** | Pay-as-you-go tier |
| Upstash Redis | **$20–50** | Scales with commands |
| **Total** | **$65–125** | Scales linearly |

---

## Conclusion

**Use Firebase App Hosting** for RouteForge:
- ✅ Free tier is real and usable
- ✅ You know Firebase already
- ✅ Google OAuth is native
- ✅ Costs scale predictably
- ✅ No surprise charges from bots
- ✅ Built-in security & DDoS protection

**Alternative**: If you want zero cold starts, use DigitalOcean App Platform ($5/mth) or self-hosted VPS.
