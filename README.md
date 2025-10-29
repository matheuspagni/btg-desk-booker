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
1. Crie um projeto em https://supabase.com/ e copie **Project URL** e **anon public key**.
2. No Supabase SQL Editor, rode o conteúdo de `sql/schema.sql` (cria tabelas e índices).
3. (Opcional) Rode `sql/seed.sql` para popular áreas e mesas de exemplo.
4. **Importante (MVP sem auth):** As tabelas estão com RLS **desabilitado** para permitir inserção/remoção sem autenticação.

> Em produção, ative RLS e crie policies adequadas.

## 3) Configurar o projeto local
1. Baixe este repositório e entre na pasta.
2. Copie `.env.local.example` para `.env.local` e preencha:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=YOUR_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```
3. Instale deps e rode:
   ```bash
   npm install
   npm run dev
   # Abra http://localhost:3000
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

## 6) Observações
- Conflitos de horário na mesma mesa são impedidos via constraint SQL.
- O Mapa usa um grid simples; ajuste (x,y,w,h,rotation) das mesas conforme seu layout real.
- Sem autenticação, qualquer pessoa pode excluir reservas — adequado apenas para MVP interno controlado.
