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
  desk_id uuid references public.desks(id) on delete set null, -- Opcional: cadeira associada a uma mesa
  area_id uuid references public.areas(id) on delete cascade, -- Opcional: área da cadeira
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Índices para melhor performance
create index if not exists idx_chairs_desk_id on public.chairs(desk_id);
create index if not exists idx_chairs_area_id on public.chairs(area_id);
create index if not exists idx_chairs_is_active on public.chairs(is_active);
create index if not exists idx_chairs_position on public.chairs(x, y);

-- Comentários para documentação
comment on table public.chairs is 'Tabela de cadeiras no mapa. Cadeiras não usam slots e armazenam posição direta (x, y).';
comment on column public.chairs.rotation is 'Rotação da cadeira: 0 = acima (0°), 1 = direita (90°), 2 = abaixo (180°), 3 = esquerda (270°)';
comment on column public.chairs.desk_id is 'ID da mesa associada (opcional). Cadeira pode estar próxima de uma mesa específica.';
comment on column public.chairs.area_id is 'ID da área da cadeira (opcional). Pode ser diferente da mesa associada.';

