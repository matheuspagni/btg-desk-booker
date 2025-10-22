-- Script para remover colunas de horário da tabela reservations
-- Execute este script no SQL Editor do Supabase

-- Remover as colunas starts_at e ends_at se existirem
ALTER TABLE public.reservations 
DROP COLUMN IF EXISTS starts_at;

ALTER TABLE public.reservations 
DROP COLUMN IF EXISTS ends_at;

-- Verificar a estrutura final da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
