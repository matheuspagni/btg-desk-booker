-- Adicionar campo is_blocked na tabela desks
-- Este campo indica se a mesa está bloqueada (útil para manutenção)
-- Mesas bloqueadas não podem receber novas reservas

ALTER TABLE desks 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Criar índice para melhorar performance nas consultas de mesas bloqueadas
CREATE INDEX IF NOT EXISTS idx_desks_is_blocked ON desks(is_blocked);

-- Comentário na coluna
COMMENT ON COLUMN desks.is_blocked IS 'Indica se a mesa está bloqueada. Mesas bloqueadas não podem receber novas reservas.';

