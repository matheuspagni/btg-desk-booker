-- Script para corrigir o schema da tabela reservations
-- Execute este script no SQL Editor do Supabase

-- Primeiro, vamos verificar se a tabela existe e sua estrutura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND table_schema = 'public';

-- Se a coluna 'date' não existir, vamos adicioná-la
-- (Execute apenas se necessário)
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS date date;

-- Se a tabela não existir, vamos criá-la
CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id uuid NOT NULL REFERENCES public.desks(id) ON DELETE CASCADE,
  date date NOT NULL,
  note text,
  is_recurring boolean DEFAULT false,
  recurring_days integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Verificar se a tabela foi criada corretamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'reservations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
