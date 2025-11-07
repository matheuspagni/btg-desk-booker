-- =====================================================
-- MIGRAÇÃO: Remover tabela de slots e coluna slot_id
-- =====================================================

-- Adicionar colunas de coordenadas/dimensões se ainda não existirem
ALTER TABLE public.desks ADD COLUMN IF NOT EXISTS x int;
ALTER TABLE public.desks ADD COLUMN IF NOT EXISTS y int;
ALTER TABLE public.desks ADD COLUMN IF NOT EXISTS width_units int default 3;
ALTER TABLE public.desks ADD COLUMN IF NOT EXISTS height_units int default 2;
ALTER TABLE public.desks ADD COLUMN IF NOT EXISTS is_blocked boolean default false;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'slots'
    ) THEN
        UPDATE public.desks d
        SET
            x = COALESCE(d.x, s.x),
            y = COALESCE(d.y, s.y),
            width_units = COALESCE(d.width_units, GREATEST(1, s.w / 40)),
            height_units = COALESCE(d.height_units, GREATEST(1, s.h / 40))
        FROM public.slots s
        WHERE d.slot_id = s.id;
    END IF;
END $$;

-- Remover constraint antiga que liga mesas a slots
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'desks_slot_id_fkey'
    ) THEN
        ALTER TABLE public.desks DROP CONSTRAINT desks_slot_id_fkey;
    END IF;
END $$;

-- Remover coluna slot_id, se ainda existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'desks'
          AND column_name = 'slot_id'
    ) THEN
        ALTER TABLE public.desks DROP COLUMN slot_id;
    END IF;
END $$;

-- Remover tabela de slots
DROP TABLE IF EXISTS public.slots;

-- Garantir que area_id permite NULL
ALTER TABLE public.desks ALTER COLUMN area_id DROP NOT NULL;

-- Garantir unicidade por código global
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'desks_area_id_code_key'
    ) THEN
        ALTER TABLE public.desks DROP CONSTRAINT desks_area_id_code_key;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS desks_code_unique
ON public.desks ((upper(code)));

-- Ajustar códigos existentes para maiúsculas
UPDATE public.desks SET code = upper(code);

