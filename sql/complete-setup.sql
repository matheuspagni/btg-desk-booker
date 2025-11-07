-- =====================================================
-- SCRIPT COMPLETO - BTG DESK BOOKER (sem tabela de slots)
-- Execute este script uma única vez no Supabase
-- =====================================================

-- Limpar dados existentes para começar do zero
delete from public.reservations;
delete from public.desks;
delete from public.areas;

-- =====================================================
-- SCHEMA - TABELAS
-- =====================================================

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#0ea5e9',
  created_at timestamptz default now()
);

create table if not exists public.desks (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references public.areas(id) on delete set null,
  code text not null unique,
  x int not null,
  y int not null,
  width_units int not null default 3,
  height_units int not null default 2,
  is_active boolean not null default true,
  is_blocked boolean not null default false,
  created_at timestamptz default now()
);

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
-- SEED DATA - ÁREAS E MESAS
-- =====================================================

insert into areas (name, color) values
  ('Derivativos', '#0ea5e9'),
  ('Sem Área', '#f59e0b');

with grid as (
  select
    row_num,
    col_num,
    80 + (col_num - 1) * 120 as x,
    (row_num - 1) * 80 as y,
    case 
      when row_num = 1 then 'C'
      when row_num = 3 then 'B'
      when row_num = 4 then 'A'
      else null
    end as prefix,
    case
      when row_num = 1 and col_num in (1, 2, 3) then (select id from areas where name = 'Derivativos')
      when row_num in (1,3,4) then (select id from areas where name = 'Sem Área')
      else null
    end as area_id
  from generate_series(1, 4) as row_num
  cross join generate_series(1, 10) as col_num
)
insert into desks (area_id, code, x, y, width_units, height_units, is_active, is_blocked)
select 
  area_id,
  prefix || col_num as code,
  x,
  y,
  3,
  2,
  true,
  false
from grid
where prefix is not null
  and area_id is not null
  and (
    prefix <> 'A' 
    or col_num <= 2 -- Linha A apenas com duas mesas
  );

-- =====================================================
-- CONCLUÍDO!
-- =====================================================

select 'Áreas:' as tipo, count(*) as total from areas
union all
select 'Mesas:', count(*) from desks;
