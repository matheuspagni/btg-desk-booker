# 🚀 Guia de Deploy em Produção

## Checklist Pré-Deploy

✅ **Código:**
- [x] Todos os erros corrigidos
- [x] Slots vazios removidos do mapa
- [x] Funcionalidade de criar mesa removida
- [x] Cálculo de relatórios corrigido (data local, mesas ativas)
- [x] API funcionando corretamente

✅ **Configuração:**
- [ ] Projeto Supabase de produção criado
- [ ] Banco de dados configurado
- [ ] Variáveis de ambiente configuradas no Vercel

---

## Passos para Deploy

### 1️⃣ Configurar Supabase Produção

**Se você já tem um projeto Supabase de produção:**
```bash
# Use o script para configurar o banco
node scripts/simple-setup.js
```

**Se precisa criar do zero:**
1. Acesse https://supabase.com/
2. Crie um novo projeto (ou use existente)
3. Copie **Project URL** e **anon public key**

**Se quer clonar de dev para produção:**
```bash
# Configure no .env.local
SOURCE_SUPABASE_URL=https://projeto-dev.supabase.co
SOURCE_SUPABASE_KEY=sua-chave-dev
TARGET_SUPABASE_URL=https://projeto-prod.supabase.co
TARGET_SUPABASE_KEY=sua-chave-prod

# Execute
node scripts/clone-database.js
```

---

### 2️⃣ Configurar Variáveis no Vercel

1. **Acesse seu projeto no Vercel:**
   - Vá em **Settings** → **Environment Variables**

2. **Adicione as variáveis:**
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://seu-projeto-prod.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sua-chave-anon-prod
   ```

3. **Selecione os ambientes:**
   - ✅ Production
   - ✅ Preview (opcional)
   - ✅ Development (opcional)

---

### 3️⃣ Deploy no Vercel

**Opção 1: Via Git (Recomendado)**
```bash
# Faça commit e push das mudanças
git add .
git commit -m "Preparado para produção"
git push origin main
```
O Vercel fará deploy automático.

**Opção 2: Via Vercel CLI**
```bash
# Instale o Vercel CLI (se não tiver)
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

---

### 4️⃣ Verificações Pós-Deploy

Após o deploy, verifique:

1. **A aplicação carrega?**
   - Acesse a URL do Vercel
   - Verifique se o mapa aparece

2. **Os dados aparecem?**
   - Verifique se as mesas aparecem no mapa
   - Confira se há 22 mesas

3. **As APIs funcionam?**
   - Abra o console do navegador (F12)
   - Verifique se não há erros

4. **Os relatórios funcionam?**
   - Abra o modal de relatórios
   - Verifique se "Total de Mesas" mostra 22
   - Verifique se "Reservas Hoje" funciona

---

## ⚠️ Checklist de Segurança (Opcional)

Se você planeja adicionar autenticação no futuro:

- [ ] Ativar Row Level Security (RLS) no Supabase
- [ ] Criar policies adequadas
- [ ] Implementar autenticação no Next.js
- [ ] Adicionar validação de usuário nas APIs

**Por enquanto, o projeto está configurado sem autenticação (MVP).**

---

## 🔧 Troubleshooting

### Problema: Mesas não aparecem
- Verifique se as variáveis de ambiente estão corretas no Vercel
- Verifique se o banco de dados tem dados inseridos
- Verifique se RLS está desabilitado (para MVP sem auth)

### Problema: Erro ao criar reservas
- Verifique a API `/api/reservations`
- Verifique os logs no Vercel
- Verifique se as tabelas existem no Supabase

### Problema: Relatórios mostrando 0
- Verifique se as reservas têm a data correta
- Verifique se o cálculo de data local está funcionando
- Verifique se há mesas ativas (`is_active = true`)

---

## 📝 Notas Importantes

1. **Variáveis de Ambiente:**
   - As variáveis `NEXT_PUBLIC_*` são expostas no cliente
   - Não exponha chaves secretas com `NEXT_PUBLIC_`

2. **Banco de Dados:**
   - O plano Free do Supabase tem limite de 500 MB
   - Verifique o uso regularmente

3. **Performance:**
   - A aplicação está otimizada para Next.js 14
   - Usa API Routes para todas as operações de banco
   - Não há acesso direto ao Supabase no frontend

---

## ✅ Status Final

**Aplicação pronta para produção!**

- ✅ Código limpo e sem funcionalidades desnecessárias
- ✅ APIs funcionando corretamente
- ✅ Cálculos relativos ao total de mesas (não fixos)
- ✅ Data local corrigida nos relatórios
- ✅ Sem slots vazios no mapa
- ✅ Sem funcionalidade de criar mesa

**Próximo passo:** Configure as variáveis no Vercel e faça o deploy! 🚀
