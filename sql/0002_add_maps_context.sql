-- =====================================================
-- MIGRAÇÃO 0002 - SUPORTE A MÚLTIPLOS MAPAS
-- Cria a tabela de mapas e adiciona o relacionamento
-- com todas as entidades existentes (áreas, mesas,
-- cadeiras, reservas e logs). Mantém os dados atuais
-- migrando-os para um mapa padrão.
-- =====================================================

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  floor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_maps_unique_identity
  ON maps (LOWER(name), COALESCE(company, ''), COALESCE(floor, ''));


DO $$
DECLARE
  default_map_id UUID;
BEGIN
  -- Garantir que exista pelo menos um mapa para associar os registros atuais
  SELECT id INTO default_map_id
  FROM maps
  ORDER BY created_at
  LIMIT 1;

  IF default_map_id IS NULL THEN
    INSERT INTO maps (name, company, floor)
    VALUES ('Mapa Principal', NULL, NULL)
    RETURNING id INTO default_map_id;
  END IF;

  -- =====================================================
  -- ÁREAS
  -- =====================================================
  ALTER TABLE areas ADD COLUMN IF NOT EXISTS map_id UUID;

  UPDATE areas
  SET map_id = default_map_id
  WHERE map_id IS NULL;

  ALTER TABLE areas ALTER COLUMN map_id SET NOT NULL;
  ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_name_key;
  CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_map_name_unique
    ON areas (map_id, LOWER(name));

  ALTER TABLE areas
    DROP CONSTRAINT IF EXISTS areas_map_id_fkey;
  ALTER TABLE areas
    ADD CONSTRAINT areas_map_id_fkey
    FOREIGN KEY (map_id) REFERENCES maps(id)
    ON DELETE CASCADE;

  -- =====================================================
  -- MESAS
  -- =====================================================
  ALTER TABLE desks ADD COLUMN IF NOT EXISTS map_id UUID;

  UPDATE desks
  SET map_id = (
    SELECT a.map_id
    FROM areas a
    WHERE a.id = desks.area_id
  )
  WHERE map_id IS NULL;

  UPDATE desks
  SET map_id = default_map_id
  WHERE map_id IS NULL;

  ALTER TABLE desks ALTER COLUMN map_id SET NOT NULL;
  ALTER TABLE desks DROP CONSTRAINT IF EXISTS desks_code_key;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_desks_map_code_unique
    ON desks (map_id, UPPER(code));

  CREATE INDEX IF NOT EXISTS idx_desks_map_id
    ON desks (map_id);

  ALTER TABLE desks
    DROP CONSTRAINT IF EXISTS desks_map_id_fkey;
  ALTER TABLE desks
    ADD CONSTRAINT desks_map_id_fkey
    FOREIGN KEY (map_id) REFERENCES maps(id)
    ON DELETE CASCADE;

  -- =====================================================
  -- CADEIRAS
  -- =====================================================
  ALTER TABLE chairs ADD COLUMN IF NOT EXISTS map_id UUID;

  UPDATE chairs
  SET map_id = default_map_id
  WHERE map_id IS NULL;

  ALTER TABLE chairs ALTER COLUMN map_id SET NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_chairs_map_position_unique
    ON chairs (map_id, x, y);

  CREATE INDEX IF NOT EXISTS idx_chairs_map_id
    ON chairs (map_id);

  ALTER TABLE chairs
    DROP CONSTRAINT IF EXISTS chairs_map_id_fkey;
  ALTER TABLE chairs
    ADD CONSTRAINT chairs_map_id_fkey
    FOREIGN KEY (map_id) REFERENCES maps(id)
    ON DELETE CASCADE;

  -- =====================================================
  -- LOGS DE RESERVA
  -- =====================================================
  ALTER TABLE reservation_logs ADD COLUMN IF NOT EXISTS map_id UUID;

  UPDATE reservation_logs
  SET map_id = (
    SELECT d.map_id
    FROM desks d
    WHERE d.id = reservation_logs.desk_id
  )
  WHERE map_id IS NULL;

  UPDATE reservation_logs
  SET map_id = default_map_id
  WHERE map_id IS NULL;

  CREATE INDEX IF NOT EXISTS idx_reservation_logs_map_id
    ON reservation_logs (map_id);

  ALTER TABLE reservation_logs
    DROP CONSTRAINT IF EXISTS reservation_logs_map_id_fkey;
  ALTER TABLE reservation_logs
    ADD CONSTRAINT reservation_logs_map_id_fkey
    FOREIGN KEY (map_id) REFERENCES maps(id)
    ON DELETE SET NULL;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================


