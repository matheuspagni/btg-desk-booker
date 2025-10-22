-- =====================================================
-- SCRIPT COMPLETO - BTG DESK BOOKER
-- Execute este script uma única vez no Supabase
-- =====================================================

-- Limpar dados existentes para começar do zero
delete from public.reservations;
delete from public.desks;
delete from public.slots;
delete from public.areas;

-- =====================================================
-- SCHEMA - TABELAS
-- =====================================================

-- Tabela de áreas
create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#0ea5e9',
  created_at timestamptz default now()
);

-- Tabela de slots pré-definidos
create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  row_number int not null,
  col_number int not null,
  x int not null,
  y int not null,
  w int not null default 120,
  h int not null default 80,
  is_available boolean not null default true,
  created_at timestamptz default now(),
  unique(area_id, row_number, col_number)
);

-- Tabela de mesas (agora ligada aos slots)
create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  area_id uuid not null references public.areas(id) on delete cascade,
  code text not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique(area_id, code)
);

-- Tabela de reservas
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  desk_id uuid not null references public.desks(id) on delete cascade,
  date date not null,
  note text,
  is_recurring boolean default false,
  recurring_days integer[] default '{}',
  created_at timestamptz default now()
);


-- =====================================================
-- SEED DATA - ÁREAS E SLOTS
-- =====================================================

-- Inserir duas áreas: Derivativos e Sem Área
insert into areas (name, color) values
  ('Derivativos', '#0ea5e9'), -- Cor azul para Derivativos
  ('Sem Área', '#f59e0b'); -- Cor laranja para outras mesas

-- Inserir slots apenas para as mesas (colunas 1-10)
-- Apenas colunas 1-3 da linha 1: Derivativos, resto: Sem Área
insert into slots (area_id, row_number, col_number, x, y, w, h, is_available)
select
  case 
    when row_num = 1 and col_num in (1, 2, 3) then (select id from areas where name = 'Derivativos')
    else (select id from areas where name = 'Sem Área')
  end,
  row_num,
  col_num,
  80 + (col_num - 1) * 120, -- Calcula X: offset de 80px + (col_num - 1) * largura
  (row_num - 1) * 80,  -- Calcula Y: (row_num - 1) * altura (alinhado com grid)
  120, -- Largura do slot (3 quadrados * 40px)
  80, -- Altura do slot (2 quadrados * 40px)
  true -- Todos os slots começam disponíveis
from generate_series(1, 4) as row_num -- 4 linhas no total
cross join generate_series(1, 10) as col_num -- 10 colunas no total
where row_num != 2; -- Pula a linha 2 (corredor horizontal)

-- =====================================================
-- SEED DATA - MESAS
-- =====================================================

-- Inserir mesas nos slots específicos conforme o layout modificado
-- Linha 1: C1, C2, C3, C4, C5, C6, C7, C8, C9, C10 (Derivativos: C1, C2, C3 | Sem Área: C4-C10)
insert into desks (slot_id, area_id, code, is_active)
select 
  s.id,
  s.area_id,
  case 
    when s.col_number = 1 then 'C1'
    when s.col_number = 2 then 'C2'
    when s.col_number = 3 then 'C3'
    when s.col_number = 4 then 'C4'
    when s.col_number = 5 then 'C5'
    when s.col_number = 6 then 'C6'
    when s.col_number = 7 then 'C7'
    when s.col_number = 8 then 'C8'
    when s.col_number = 9 then 'C9'
    when s.col_number = 10 then 'C10'
  end,
  true
from slots s
where s.row_number = 1;

-- Linha 3: B1, B2, B3, B4, B5, B6, B7, B8, B9, B10 (todas Sem Área)
insert into desks (slot_id, area_id, code, is_active)
select 
  s.id,
  s.area_id,
  case 
    when s.col_number = 1 then 'B1'
    when s.col_number = 2 then 'B2'
    when s.col_number = 3 then 'B3'
    when s.col_number = 4 then 'B4'
    when s.col_number = 5 then 'B5'
    when s.col_number = 6 then 'B6'
    when s.col_number = 7 then 'B7'
    when s.col_number = 8 then 'B8'
    when s.col_number = 9 then 'B9'
    when s.col_number = 10 then 'B10'
  end,
  true
from slots s
where s.row_number = 3;

-- Linha 4: A1, A2, A3, A4, A5, A6, A7, A8, A9, A10 (todas Sem Área)
insert into desks (slot_id, area_id, code, is_active)
select 
  s.id,
  s.area_id,
  case 
    when s.col_number = 1 then 'A1'
    when s.col_number = 2 then 'A2'
    when s.col_number = 3 then 'A3'
    when s.col_number = 4 then 'A4'
    when s.col_number = 5 then 'A5'
    when s.col_number = 6 then 'A6'
    when s.col_number = 7 then 'A7'
    when s.col_number = 8 then 'A8'
    when s.col_number = 9 then 'A9'
    when s.col_number = 10 then 'A10'
  end,
  true
from slots s
where s.row_number = 4;

-- Marcar slots ocupados como indisponíveis
update slots 
set is_available = false
where id in (
  select slot_id from desks where is_active = true
);


-- =====================================================
-- CONCLUÍDO!
-- =====================================================

-- Verificar dados inseridos
select 'Áreas:' as tipo, count(*) as total from areas
union all
select 'Slots:', count(*) from slots
union all
select 'Mesas:', count(*) from desks;
