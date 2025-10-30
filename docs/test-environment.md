# Ambiente de Testes

Esta branch `release` é dedicada para testes e desenvolvimento de novas funcionalidades antes de aplicar em produção.

## 🎯 Objetivo

Permitir desenvolvimento e testes de novas funcionalidades sem afetar o ambiente de produção.

## 🔧 Configuração

### Variáveis de Ambiente

Para trabalhar no ambiente de testes, edite manualmente o arquivo `.env.local`:

```bash
# Ambiente de Testes
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key

# Ambiente de Produção (comentado)
# NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
```

### Banco de Dados de Teste

- **Projeto Supabase:** Dedicado para testes
- **Dados:** Cópia dos dados de produção (se necessário)
- **Mesas:** Estrutura idêntica à produção

## 🚀 Workflow

### 1. Desenvolvimento na Branch de Teste

```bash
# Fazer checkout da branch de teste
git checkout release

# Fazer alterações
# ... desenvolver funcionalidades ...

# Commit das alterações
git add .
git commit -m "feat: add new feature for testing"

# Push para a branch de teste
git push origin release
```

### 2. Testes no Ambiente de Teste

- **URL:** `https://your-test-app.vercel.app` (ou localhost)
- **Banco:** Projeto Supabase de teste
- **Dados:** Dados de teste isolados

### 3. Merge para Produção

Após testes bem-sucedidos:

```bash
# Voltar para main
git checkout main

# Merge da branch de teste
git merge release/test-environment

# Push para produção
git push origin main
```

## 📋 Checklist de Testes

Antes de fazer merge para produção, verificar:

- [ ] **Funcionalidades novas** funcionando corretamente
- [ ] **Mesas e reservas** operando normalmente
- [ ] **Relatórios** gerando dados corretos
- [ ] **Interface** responsiva e sem erros
- [ ] **Performance** adequada
- [ ] **Dados de teste** não afetam produção

## 🔄 Sincronização com Produção

Para manter a branch de teste atualizada:

```bash
# Na branch de teste
git checkout release

# Buscar atualizações da main
git fetch origin main
git merge origin/main

# Resolver conflitos se houver
# Push das atualizações
git push origin release
```

## 📝 Documentação

- **Alterações de mesas:** Atualizar `docs/desk-layout-history.md`
- **Novas funcionalidades:** Documentar em `docs/`
- **Scripts:** Manter `scripts/` organizados

## ⚠️ Importante

- **Nunca** fazer merge direto para main sem testes
- **Sempre** testar no ambiente de teste primeiro
- **Manter** a branch de teste sincronizada com main
- **Documentar** todas as alterações significativas
