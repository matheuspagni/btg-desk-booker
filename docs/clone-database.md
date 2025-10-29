# Como Clonar o Banco de Dados no Supabase

## 📋 Pré-requisitos

- Dois projetos Supabase (Free plan permite múltiplos projetos)
- Acesso ao SQL Editor de ambos os projetos

## 🔄 Método 1: Backup e Restore via SQL (Recomendado)

### Passo 1: Exportar Schema e Dados do Projeto Original

1. No projeto **original**, vá para **SQL Editor**
2. Execute este script para exportar o schema:

```sql
-- Exportar estrutura das tabelas
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || data_type || 
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('areas', 'slots', 'desks', 'reservations', 'reservation_logs')
GROUP BY table_name;
```

### Passo 2: Exportar Dados

Execute no projeto **original** para cada tabela:

```sql
-- Exportar áreas
SELECT * FROM public.areas;

-- Exportar slots
SELECT * FROM public.slots;

-- Exportar desks
SELECT * FROM public.desks;

-- Exportar reservations
SELECT * FROM public.reservations;

-- Exportar reservation_logs (se necessário)
SELECT * FROM public.reservation_logs;
```

### Passo 3: Criar Schema no Novo Projeto

1. No projeto **novo**, vá para **SQL Editor**
2. Execute o arquivo `sql/complete-setup.sql` do repositório

### Passo 4: Importar Dados

Use os scripts SQL abaixo adaptando os valores exportados:

```sql
-- Importar áreas
INSERT INTO public.areas (id, name, color, created_at)
VALUES 
  ('uuid-aqui', 'Nome da Área', '#cor', 'timestamp'),
  ...
ON CONFLICT (id) DO NOTHING;

-- Importar slots
INSERT INTO public.slots (id, area_id, row_number, col_number, x, y, w, h, is_available, created_at)
VALUES 
  ('uuid-aqui', 'area-uuid', 1, 1, 100, 100, 120, 80, true, 'timestamp'),
  ...
ON CONFLICT (id) DO NOTHING;

-- Importar desks
INSERT INTO public.desks (id, slot_id, area_id, code, is_active, created_at)
VALUES 
  ('uuid-aqui', 'slot-uuid', 'area-uuid', 'M01', true, 'timestamp'),
  ...
ON CONFLICT (id) DO NOTHING;

-- Importar reservations
INSERT INTO public.reservations (id, desk_id, date, note, is_recurring, recurring_days, created_at)
VALUES 
  ('uuid-aqui', 'desk-uuid', '2025-01-15', 'Nome', false, '{}', 'timestamp'),
  ...
ON CONFLICT (id) DO NOTHING;
```

## 🔄 Método 2: Usando pg_dump (via Terminal)

### Passo 1: Conectar ao Banco Original

```bash
# Obter connection string no Supabase Dashboard > Settings > Database
psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

### Passo 2: Exportar

```bash
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema=public \
  --data-only \
  --table=areas \
  --table=slots \
  --table=desks \
  --table=reservations \
  > backup.sql
```

### Passo 3: Importar no Novo Projeto

```bash
psql "postgresql://postgres:[PASSWORD]@[NOVO_HOST]:5432/postgres" < backup.sql
```

## 🚀 Método 3: Script Automatizado (Recomendado para Frequência)

Crie um script Node.js para automatizar:

```javascript
// clone-db.js
const { createClient } = require('@supabase/supabase-js');

const sourceUrl = 'https://projeto-original.supabase.co';
const sourceKey = 'SUA_CHAVE_AQUI';

const targetUrl = 'https://projeto-novo.supabase.co';
const targetKey = 'SUA_CHAVE_AQUI';

const sourceClient = createClient(sourceUrl, sourceKey);
const targetClient = createClient(targetUrl, targetKey);

async function cloneDatabase() {
  // Exportar áreas
  const { data: areas } = await sourceClient.from('areas').select('*');
  if (areas) {
    await targetClient.from('areas').upsert(areas);
  }

  // Exportar slots
  const { data: slots } = await sourceClient.from('slots').select('*');
  if (slots) {
    await targetClient.from('slots').upsert(slots);
  }

  // Exportar desks
  const { data: desks } = await sourceClient.from('desks').select('*');
  if (desks) {
    await targetClient.from('desks').upsert(desks);
  }

  // Exportar reservations
  const { data: reservations } = await sourceClient.from('reservations').select('*');
  if (reservations) {
    await targetClient.from('reservations').upsert(reservations);
  }

  console.log('Clone concluído!');
}

cloneDatabase();
```

## ⚠️ Considerações Importantes

1. **Limitações do Plano Free:**
   - Máximo 500 MB de banco de dados por projeto
   - Máximo 2 GB de largura de banda
   - Máximo 500 MB de armazenamento de arquivos

2. **Custos:**
   - **Plano Free**: Permite múltiplos projetos, mas cada projeto tem limites
   - **Plano Pro ($25/mês)**: Remove limites por projeto
   - Você pode ter **2 projetos Free** sem custo adicional

3. **Sincronização:**
   - Se precisar sincronizar dados entre projetos, considere usar uma API de sincronização
   - Alternativamente, use apenas um projeto para desenvolvimento e outro para produção

4. **Backup Automático:**
   - Projetos Free têm backup diário automático
   - Projetos Pro têm backup pontual (point-in-time recovery)

## 📝 Checklist de Clone

- [ ] Criar novo projeto no Supabase
- [ ] Executar `sql/complete-setup.sql` no novo projeto
- [ ] Exportar dados do projeto original
- [ ] Importar dados no novo projeto
- [ ] Atualizar variáveis de ambiente (`.env.local`)
- [ ] Testar aplicação com novo banco

## 🔗 Links Úteis

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [PostgreSQL Backup Guide](https://supabase.com/docs/guides/database/backups)

