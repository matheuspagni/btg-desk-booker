-- =====================================================
-- CORREÇÃO: Remover ON DELETE CASCADE das foreign keys
-- para permitir que áreas sejam deletadas sem deletar
-- mesas e slots automaticamente
-- =====================================================

-- NOTA: Este script corrige o problema onde deletar uma área
-- estava causando a exclusão em cascata de todas as mesas e slots.
-- 
-- IMPORTANTE: Execute este script no Supabase SQL Editor
-- antes de usar a funcionalidade de deletar áreas.

-- Passo 1: Remover as constraints existentes
-- (Pode dar erro se as constraints tiverem nomes diferentes - verifique no Supabase)

-- Remover constraint de area_id em desks
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'desks_area_id_fkey'
    ) THEN
        ALTER TABLE public.desks DROP CONSTRAINT desks_area_id_fkey;
    END IF;
END $$;

-- Remover constraint de slot_id em desks (manter como está, apenas para referência)
-- Não removemos porque queremos manter a integridade entre desks e slots
-- DO $$ 
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'desks_slot_id_fkey'
--     ) THEN
--         ALTER TABLE public.desks DROP CONSTRAINT desks_slot_id_fkey;
--     END IF;
-- END $$;

-- Remover constraint de area_id em slots
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'slots_area_id_fkey'
    ) THEN
        ALTER TABLE public.slots DROP CONSTRAINT slots_area_id_fkey;
    END IF;
END $$;

-- Passo 2: Permitir que area_id seja NULL nas tabelas
ALTER TABLE public.desks 
ALTER COLUMN area_id DROP NOT NULL;

ALTER TABLE public.slots 
ALTER COLUMN area_id DROP NOT NULL;

-- Passo 3: Recriar as constraints com ON DELETE SET NULL ao invés de CASCADE

-- Constraint para desks.area_id -> areas.id
ALTER TABLE public.desks 
ADD CONSTRAINT desks_area_id_fkey 
FOREIGN KEY (area_id) 
REFERENCES public.areas(id) 
ON DELETE SET NULL;

-- Constraint para slots.area_id -> areas.id
ALTER TABLE public.slots 
ADD CONSTRAINT slots_area_id_fkey 
FOREIGN KEY (area_id) 
REFERENCES public.areas(id) 
ON DELETE SET NULL;

-- IMPORTANTE: A constraint desks.slot_id -> slots.id deve permanecer
-- como ON DELETE RESTRICT ou CASCADE, dependendo da necessidade.
-- Se você quiser que slots possam ser deletados (e mesas também),
-- mantenha CASCADE. Se não, mude para RESTRICT.
-- Por enquanto, vamos manter como está (não alteramos essa constraint)

-- Passo 4: Remover a constraint UNIQUE(area_id, code) de desks se existir
-- porque agora area_id pode ser NULL e múltiplas mesas podem ter area_id NULL
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'desks_area_id_code_key'
    ) THEN
        ALTER TABLE public.desks DROP CONSTRAINT desks_area_id_code_key;
    END IF;
END $$;

-- Recriar a constraint UNIQUE mas permitindo múltiplos NULLs
-- (PostgreSQL permite múltiplos NULLs em UNIQUE por padrão, mas vamos criar um índice parcial)
CREATE UNIQUE INDEX IF NOT EXISTS desks_area_id_code_unique 
ON public.desks (area_id, code) 
WHERE area_id IS NOT NULL;

-- =====================================================
-- CONCLUÍDO!
-- =====================================================
-- Agora quando uma área for deletada:
-- 1. O banco automaticamente define area_id = NULL nas mesas vinculadas
-- 2. O banco automaticamente define area_id = NULL nos slots vinculados
-- 3. Mesas e slots NÃO serão deletados
-- 
-- NOTA: Se você já deletou áreas antes de executar este script,
-- as mesas e slots já foram deletados. Você precisará recriá-los.

