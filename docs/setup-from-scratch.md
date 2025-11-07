# Setup Completo: Nova Conta Supabase

## 🎯 Objetivo

Configurar o projeto BTG Desk Booker do zero com uma nova conta Supabase.

## 📋 Pré-requisitos

- [x] Nova conta Supabase criada
- [x] Projeto Next.js baixado
- [x] Node.js 18+ instalado

## 🚀 Passo a Passo

### 1. Obter Credenciais do Supabase

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Faça login com sua nova conta
3. Crie um novo projeto:
   - **Nome**: `btg-desk-booker` (ou similar)
   - **Database Password**: Anote a senha (você vai precisar)
   - **Region**: Escolha a mais próxima (ex: South America - São Paulo)
4. Aguarde a criação do projeto (2-3 minutos)
5. Vá em **Settings** → **API**
6. Copie:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public key** (chave longa que começa com `eyJ...`)

### 2. Configurar Variáveis de Ambiente

1. **Copie o arquivo de exemplo:**
   ```bash
   cp env.example .env.local
   ```

2. **Edite o arquivo `.env.local`:**
   ```bash
   nano .env.local  # ou use seu editor preferido
   ```

3. **Substitua os valores:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

### 3. Executar Setup Automático

```bash
# Instalar dependências (se ainda não fez)
npm install

# Executar script de configuração
node scripts/setup-new-project.js
```

O script vai:
- ✅ Verificar conexão com Supabase
- ✅ Executar schema SQL automaticamente
- ✅ Criar tabelas (areas, desks, reservations)
- ✅ Inserir dados iniciais
- ✅ Verificar se tudo foi criado corretamente

### 4. Verificar Configuração

```bash
# Verificar variáveis de ambiente
node scripts/check-env.js

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse http://localhost:3000 e verifique se:
- [x] O mapa carrega
- [x] As mesas aparecem
- [x] É possível criar reservas

### 5. Configurar Produção (Vercel)

1. **Acesse [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Vá em seu projeto → Settings → Environment Variables**
3. **Adicione as mesmas variáveis:**
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://seu-projeto-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sua-chave-anon-aqui
   ```
4. **Faça deploy:**
   ```bash
   git add .
   git commit -m "Setup: Configurar nova conta Supabase"
   git push
   ```

## 🔧 Solução de Problemas

### Erro: "Supabase configuration missing"
- Verifique se o arquivo `.env.local` existe
- Confirme se as variáveis estão corretas
- Execute: `node scripts/check-env.js`

### Erro: "Failed to fetch"
- Verifique se a URL do Supabase está correta
- Confirme se a chave anon está correta
- Teste a conexão: `node scripts/setup-new-project.js`

### Erro: "Table doesn't exist"
- Execute o schema SQL manualmente no Supabase Dashboard
- Ou execute: `node scripts/setup-new-project.js`

### Erro: "Permission denied"
- Verifique se RLS está desabilitado no Supabase
- Vá em **Authentication** → **Policies** e desabilite RLS temporariamente

## 📊 Verificar se Funcionou

### No Supabase Dashboard:
1. **Table Editor** → Verifique se existem as tabelas:
   - `areas` (2 registros)
   - `desks` (várias mesas)
   - `reservations` (vazia inicialmente)

2. **SQL Editor** → Execute:
   ```sql
   SELECT 'Áreas:' as tipo, count(*) as total from areas
   UNION ALL
   SELECT 'Mesas:', count(*) from desks
   UNION ALL
   SELECT 'Reservas:', count(*) from reservations;
   ```

### Na Aplicação:
1. **Mapa carrega** sem erros
2. **Mesas aparecem** no layout
3. **É possível criar reservas**
4. **Relatórios funcionam**

## ✅ Checklist Final

- [ ] Nova conta Supabase criada
- [ ] Projeto Supabase criado
- [ ] Credenciais copiadas
- [ ] Arquivo `.env.local` configurado
- [ ] Script de setup executado com sucesso
- [ ] Aplicação local funcionando
- [ ] Variáveis configuradas no Vercel
- [ ] Deploy em produção funcionando

## 🆘 Precisa de Ajuda?

Se algo não funcionar:

1. **Execute o script de verificação:**
   ```bash
   node scripts/check-env.js
   ```

2. **Execute o setup novamente:**
   ```bash
   node scripts/setup-new-project.js
   ```

3. **Verifique os logs do Supabase:**
   - Dashboard → Logs → API Logs

4. **Teste a conexão manualmente:**
   - Supabase Dashboard → SQL Editor
   - Execute: `SELECT * FROM areas LIMIT 1;`
