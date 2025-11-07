-- =====================================================
-- TABELA DE CADEIRAS
-- =====================================================
-- Cadeiras são elementos independentes que não usam slots
-- Armazena posição direta (x, y) e rotação

create table if not exists public.chairs (
  id uuid primary key default gen_random_uuid(),
  x int not null,
  y int not null,
  rotation int not null default 0, -- 0 = acima, 1 = direita, 2 = abaixo, 3 = esquerda
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Índices para melhor performance
create index if not exists idx_chairs_is_active on public.chairs(is_active);
create index if not exists idx_chairs_position on public.chairs(x, y);

-- Comentários para documentação
comment on table public.chairs is 'Tabela de cadeiras no mapa. Cadeiras são elementos independentes com posição (x, y) e rotação.';
comment on column public.chairs.rotation is 'Rotação da cadeira: 0 = acima (0°), 1 = direita (90°), 2 = abaixo (180°), 3 = esquerda (270°)';

