-- Remover campos desk_id e area_id da tabela chairs
-- Cadeiras são elementos independentes e não precisam estar vinculadas a mesas ou áreas

-- 1. Remover constraints de foreign key (se existirem)
ALTER TABLE public.chairs 
DROP CONSTRAINT IF EXISTS chairs_desk_id_fkey;

ALTER TABLE public.chairs 
DROP CONSTRAINT IF EXISTS chairs_area_id_fkey;

-- 2. Remover índices (se existirem)
DROP INDEX IF EXISTS idx_chairs_desk_id;
DROP INDEX IF EXISTS idx_chairs_area_id;

-- 3. Remover as colunas
ALTER TABLE public.chairs 
DROP COLUMN IF EXISTS desk_id;

ALTER TABLE public.chairs 
DROP COLUMN IF EXISTS area_id;

-- 4. Atualizar comentários (opcional)
COMMENT ON TABLE public.chairs IS 'Tabela de cadeiras no mapa. Cadeiras são elementos independentes com posição (x, y) e rotação.';

