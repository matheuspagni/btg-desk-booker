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

## 5) Observações
- Conflitos de horário na mesma mesa são impedidos via constraint SQL.
- O Mapa usa um grid simples; ajuste (x,y,w,h,rotation) das mesas conforme seu layout real.
- Sem autenticação, qualquer pessoa pode excluir reservas — adequado apenas para MVP interno controlado.
