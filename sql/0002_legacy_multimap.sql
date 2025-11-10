-- =====================================================
-- MIGRAÇÃO 0002 - Ajustes para suporte a múltiplos mapas
-- Executar apenas em bases legadas (pré multi-mapas). Para
-- novas instalações utilizar somente a migração 0001.
-- =====================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Estruturas de hierarquia (empresas, escritórios, andares)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS offices_company_name_lower_idx
  ON offices (company_id, LOWER(name));

CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS floors_office_name_lower_idx
  ON floors (office_id, LOWER(name));

-- 2) Estrutura adicional para maps
ALTER TABLE maps ADD COLUMN IF NOT EXISTS floor_id UUID;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE maps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE maps ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE maps ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE c.conname = 'maps_floor_id_fkey'
       AND t.relname = 'maps'
  ) THEN
    ALTER TABLE maps
      ADD CONSTRAINT maps_floor_id_fkey
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maps_floor_id ON maps(floor_id);
CREATE UNIQUE INDEX IF NOT EXISTS maps_floor_name_lower_idx
  ON maps (floor_id, LOWER(name));

-- 3) Colunas de relacionamento nas tabelas existentes
ALTER TABLE areas ADD COLUMN IF NOT EXISTS map_id UUID;
ALTER TABLE desks ADD COLUMN IF NOT EXISTS map_id UUID;
ALTER TABLE chairs ADD COLUMN IF NOT EXISTS map_id UUID;
ALTER TABLE reservation_logs ADD COLUMN IF NOT EXISTS map_id UUID;

-- 4) Criar hierarquia padrão e popular relacionamentos
DO $$
DECLARE
  btg_company_id   UUID;
  default_office_id UUID;
  default_floor_id  UUID;
  default_map_id    UUID;
BEGIN
  INSERT INTO companies (name)
  VALUES ('BTG Pactual')
  ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO btg_company_id;

  INSERT INTO offices (company_id, name)
  VALUES (btg_company_id, 'Pátio Victor Malzoni')
  ON CONFLICT (company_id, LOWER(name)) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO default_office_id;

  INSERT INTO floors (office_id, name)
  VALUES (default_office_id, '10')
  ON CONFLICT (office_id, LOWER(name)) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO default_floor_id;

  SELECT id
    INTO default_map_id
    FROM maps
   WHERE floor_id = default_floor_id
   ORDER BY created_at NULLS FIRST, id
   LIMIT 1;

  IF default_map_id IS NULL THEN
    INSERT INTO maps (name, floor_id)
    VALUES ('Mapa Principal', default_floor_id)
    RETURNING id INTO default_map_id;
  END IF;

  UPDATE maps
     SET floor_id = COALESCE(floor_id, default_floor_id),
         created_at = COALESCE(created_at, NOW()),
         updated_at = NOW()
   WHERE floor_id IS NULL OR created_at IS NULL;

  UPDATE areas
     SET map_id = COALESCE(map_id, default_map_id);

  UPDATE desks
     SET map_id = COALESCE(map_id, default_map_id);

  UPDATE chairs
     SET map_id = COALESCE(map_id, default_map_id);

  UPDATE reservation_logs
     SET map_id = COALESCE(map_id, default_map_id);
END $$;

ALTER TABLE areas ALTER COLUMN map_id SET NOT NULL;
ALTER TABLE desks ALTER COLUMN map_id SET NOT NULL;
ALTER TABLE chairs ALTER COLUMN map_id SET NOT NULL;

-- 5) Eliminar cadeiras duplicadas por posição dentro do mesmo mapa
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY map_id, x, y ORDER BY created_at NULLS FIRST, id) AS rn
  FROM chairs
)
DELETE FROM chairs
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE rn > 1
);

-- 6) Ajustar constraints e índices
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_name_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE c.conname = 'areas_map_id_fkey'
       AND t.relname = 'areas'
  ) THEN
    ALTER TABLE areas
      ADD CONSTRAINT areas_map_id_fkey
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_map_name_unique
  ON areas (map_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_areas_map_id ON areas(map_id);

ALTER TABLE desks DROP CONSTRAINT IF EXISTS desks_code_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE c.conname = 'desks_map_id_fkey'
       AND t.relname = 'desks'
  ) THEN
    ALTER TABLE desks
      ADD CONSTRAINT desks_map_id_fkey
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_desks_map_code_unique
  ON desks (map_id, UPPER(code));
CREATE INDEX IF NOT EXISTS idx_desks_map_id ON desks(map_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE c.conname = 'chairs_map_id_fkey'
       AND t.relname = 'chairs'
  ) THEN
    ALTER TABLE chairs
      ADD CONSTRAINT chairs_map_id_fkey
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_chairs_position;
CREATE UNIQUE INDEX IF NOT EXISTS idx_chairs_map_position_unique
  ON chairs (map_id, x, y);
CREATE INDEX IF NOT EXISTS idx_chairs_map_id ON chairs(map_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
     WHERE c.conname = 'reservation_logs_map_id_fkey'
       AND t.relname = 'reservation_logs'
  ) THEN
    ALTER TABLE reservation_logs
      ADD CONSTRAINT reservation_logs_map_id_fkey
      FOREIGN KEY (map_id) REFERENCES maps(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_logs_map_id ON reservation_logs(map_id);

-- 7) Remover colunas antigas da tabela maps (se existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'maps' AND column_name = 'company'
  ) THEN
    EXECUTE 'ALTER TABLE maps DROP COLUMN company';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'maps' AND column_name = 'floor'
  ) THEN
    EXECUTE 'ALTER TABLE maps DROP COLUMN floor';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'maps' AND column_name = 'area_display_name'
  ) THEN
    EXECUTE 'ALTER TABLE maps DROP COLUMN area_display_name';
  END IF;
END $$;

COMMIT;

