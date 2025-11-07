-- Corrigir constraint de área em cadeiras para não deletar cadeiras quando área for deletada
-- Altera de ON DELETE CASCADE para ON DELETE SET NULL

-- 1. Remover a constraint antiga
ALTER TABLE public.chairs 
DROP CONSTRAINT IF EXISTS chairs_area_id_fkey;

-- 2. Adicionar a nova constraint com ON DELETE SET NULL
ALTER TABLE public.chairs 
ADD CONSTRAINT chairs_area_id_fkey 
FOREIGN KEY (area_id) 
REFERENCES public.areas(id) 
ON DELETE SET NULL;

-- 3. Permitir que area_id seja NULL (caso não esteja permitido)
ALTER TABLE public.chairs 
ALTER COLUMN area_id DROP NOT NULL;

