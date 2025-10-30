# BTG Desk Booker — sem autenticação

Aplicação Next.js + Tailwind + Supabase que permite:
- Cadastrar **áreas** e **mesas** (com posição no mapa)
- Visualizar **mapa** SVG das mesas
- Criar e excluir **reservas** por dia e intervalo de horas
- Sem autenticação: qualquer pessoa com acesso ao site consegue criar/excluir reservas (MVP)

## 1) Requisitos
- Node.js 18+
- Projeto Supabase (Postgres)

## 2) Configurar o Supabase

### ⚠️ Limitação do Plano Free

O plano Free do Supabase permite **apenas 2 projetos** por conta. Se você já tem 2 projetos:

- **Projeto 1**: Use para desenvolvimento (localhost)
- **Projeto 2**: Use para produção (Vercel)

Veja guia completo em [`docs/setup-prod-dev.md`](docs/setup-prod-dev.md)

### Configuração Inicial

1. Crie um projeto em https://supabase.com/ e copie **Project URL** e **anon public key**.
2. No Supabase SQL Editor, rode o conteúdo de `sql/complete-setup.sql` (cria tabelas e índices).
3. **Importante (MVP sem auth):** As tabelas estão com RLS **desabilitado** para permitir inserção/remoção sem autenticação.

> Em produção, ative RLS e crie policies adequadas.

## 3) Configurar o projeto local

### Método Rápido (Recomendado)

1. **Configure as credenciais do Supabase:**
   ```bash
   # Copie o arquivo de exemplo
   cp env.example .env.local
   
   # Edite o arquivo com suas credenciais
   nano .env.local  # ou use seu editor preferido
   ```

2. **Execute o script de configuração automática:**
   ```bash
   node scripts/setup-new-project.js
   ```

3. **Inicie o servidor:**
   ```bash
   npm install
   npm run dev
   # Abra http://localhost:3000
   ```

### Método Manual

1. Crie o arquivo `.env.local` com suas credenciais:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   ```

2. Execute o schema SQL no Supabase Dashboard:
   - Acesse [Supabase Dashboard](https://app.supabase.com)
   - Vá em **SQL Editor**
   - Cole e execute o conteúdo de `sql/complete-setup.sql`

3. Instale e execute:
   ```bash
   npm install
   npm run dev
   ```

## 4) Como usar
- Aba **Mapa**: clique numa mesa → informe hora inicial/final → confirmar → a reserva aparece na lateral.
- Aba **Admin**: crie novas **áreas** (com cor) e **mesas** (com coordenadas x/y, tamanho e rotação).
- Campo **Data** no topo alterna o dia.

## 5) Clonar Banco de Dados

Para usar múltiplos projetos Supabase (dev/prod) sem pagar premium:

### Método Rápido (Script Automatizado)

1. Configure as variáveis no `.env.local`:
   ```env
   # Projeto original (source)
   SOURCE_SUPABASE_URL=https://projeto-original.supabase.co
   SOURCE_SUPABASE_KEY=sua-chave-anon-original
   
   # Projeto destino (target)
   TARGET_SUPABASE_URL=https://projeto-novo.supabase.co
   TARGET_SUPABASE_KEY=sua-chave-anon-nova
   ```

2. Execute o script:
   ```bash
   node scripts/clone-database.js
   ```

### Método Manual

Veja documentação completa em [`docs/clone-database.md`](docs/clone-database.md)

### ⚠️ Limitações do Plano Free

- **Permite múltiplos projetos** no plano Free
- Cada projeto tem limite de **500 MB de banco**
- Limite de **2 GB de largura de banda** por mês
- Você pode ter **2+ projetos Free** simultaneamente sem custo

## 6) Ambientes de Desenvolvimento

### 🌿 Branches

- **`main`** - Ambiente de produção
- **`release/test-environment`** - Ambiente de testes

### 🔄 Trocar de Ambiente

Para trocar entre ambientes, edite manualmente o arquivo `.env.local`:

```bash
# Ambiente de teste - editar .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key

# Ambiente de produção - editar .env.local  
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
```

**Documentação completa:** [docs/test-environment.md](docs/test-environment.md)

## 7) Gerenciamento de Mesas

Para adicionar, remover ou modificar mesas, use o script `manage-desks.js`:

```bash
node scripts/manage-desks.js
```

**Documentação completa:** [docs/manage-desks.md](docs/manage-desks.md)

**Exemplo rápido:**
1. Edite `scripts/manage-desks.js`
2. Adicione/remova mesas no array `DESK_CONFIG`
3. Execute o script

### 📋 Histórico de Layout

Como a configuração das mesas fica no banco de dados, mantenemos um histórico no Git:

- **Histórico completo:** [docs/desk-layout-history.md](docs/desk-layout-history.md)
- **Status atual:** `node scripts/desk-status.js`

### Scripts Disponíveis

- `node scripts/check-env.js` — Verificar variáveis de ambiente
- `node scripts/setup-new-project.js` — Configurar novo projeto Supabase
- `node scripts/simple-setup.js` — Setup básico (tabelas + áreas)
- `node scripts/manage-desks.js` — **Gerenciar mesas** (adicionar/remover/modificar)
- `node scripts/desk-status.js` — **Ver status atual** das mesas no banco

## 8) Observações
- Conflitos de horário na mesma mesa são impedidos via constraint SQL.
- O Mapa usa um grid simples; ajuste (x,y,w,h,rotation) das mesas conforme seu layout real.
- Sem autenticação, qualquer pessoa pode excluir reservas — adequado apenas para MVP interno controlado.
