# Setup: Desenvolvimento e Produção com 2 Projetos Supabase

## 📋 Situação

O plano Free do Supabase permite **apenas 2 projetos** por conta. Você já tem 2 projetos. Vamos organizá-los:

- **Projeto 1**: Desenvolvimento (localhost)
- **Projeto 2**: Produção (Vercel)

## 🎯 Estratégia Recomendada

### Projeto 1 - Desenvolvimento
- Use para desenvolvimento local
- Testes e desenvolvimento de features
- Pode limpar dados quando necessário
- Configurado no `.env.local`

### Projeto 2 - Produção
- Use apenas em produção (Vercel)
- Dados reais dos usuários
- Configurado nas variáveis de ambiente do Vercel
- **NÃO use para desenvolvimento**

## ⚙️ Configuração

### 1. Identificar Qual Projeto é Qual

Acesse o [Supabase Dashboard](https://app.supabase.com) e identifique:

- **Projeto Dev**: Nome sugestivo (ex: `btg-desk-dev` ou `btg-desk-local`)
- **Projeto Prod**: Nome sugestivo (ex: `btg-desk-prod` ou `btg-desk-production`)

### 2. Configurar Desenvolvimento Local

Crie/edite o arquivo `.env.local` na raiz do projeto:

```env
# Projeto de DESENVOLVIMENTO
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-dev
```

### 3. Configurar Produção no Vercel

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em seu projeto → **Settings** → **Environment Variables**
3. Adicione as variáveis do **projeto de produção**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-prod
```

### 4. Verificar Schema nos Dois Projetos

Certifique-se de que ambos os projetos têm o schema criado:

1. Execute `sql/complete-setup.sql` em ambos os projetos
2. Ou use o script de clonagem para copiar schema de um para outro

## 🔄 Migrar Dados (Opcional)

Se você já tem dados no projeto de dev e quer copiar para prod:

```bash
# Configure as variáveis primeiro
node scripts/clone-database.js
```

**Cuidado**: Isso vai sobrescrever dados existentes no projeto destino!

## ✅ Checklist

- [ ] Identificar qual projeto é dev e qual é prod
- [ ] Renomear projetos no Supabase para facilitar identificação
- [ ] Configurar `.env.local` com projeto dev
- [ ] Configurar Environment Variables no Vercel com projeto prod
- [ ] Executar schema SQL nos dois projetos
- [ ] Testar localmente (usa projeto dev)
- [ ] Fazer deploy no Vercel (usa projeto prod)

## 🚨 Importante

1. **NUNCA** use o projeto de produção localmente
2. **SEMPRE** teste mudanças primeiro no projeto dev
3. **VERIFIQUE** as variáveis de ambiente antes de fazer deploy
4. O arquivo `.env.local` **NÃO vai para o Git** (está no .gitignore)
5. O Vercel usa as variáveis configuradas no dashboard, não o `.env.local`

## 🔄 Workflow Recomendado

```
Desenvolvimento:
  1. Trabalhe localmente com projeto DEV
  2. Teste tudo no projeto DEV
  3. Faça commit e push
  4. Vercel faz deploy automaticamente com projeto PROD
  5. Produção continua segura e isolada
```

## 📝 Renomeando Projetos no Supabase

Para facilitar identificação:

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em cada projeto → **Settings** → **General**
3. Clique em "Rename project"
4. Sugestões:
   - `btg-desk-dev` ou `btg-desk-local`
   - `btg-desk-prod` ou `btg-desk-production`

