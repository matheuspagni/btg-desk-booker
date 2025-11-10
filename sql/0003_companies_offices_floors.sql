-- =====================================================
-- MIGRAÇÃO 0003 - Empresas, Escritórios e Andares
-- Estrutura hierárquica:
-- company -> office -> floor -> maps
-- =====================================================

-- Requisitos para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Tabelas base
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

CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Restrições de unicidade (por expressão) via índices únicos
--    (não é permitido usar LOWER(name) dentro de UNIQUE constraint)
CREATE UNIQUE INDEX IF NOT EXISTS offices_company_name_lower_idx
  ON offices (company_id, LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS floors_office_name_lower_idx
  ON floors (office_id, LOWER(name));

-- 3) maps.floor_id + FK (com checagem de existência da constraint)
ALTER TABLE maps ADD COLUMN IF NOT EXISTS floor_id UUID;

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

-- 4) Seed + Upserts e migração de dados
DO $$
DECLARE
  btg_company_id   UUID;
  default_office_id UUID;
  default_floor_id  UUID;
BEGIN
  -- Empresa padrão
  INSERT INTO companies (name)
  VALUES ('BTG Pactual')
  ON CONFLICT (name) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO btg_company_id;

  -- Escritório padrão (usa índice único por expressão)
  INSERT INTO offices (company_id, name)
  VALUES (btg_company_id, 'Pátio Victor Malzoni')
  ON CONFLICT (company_id, LOWER(name)) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO default_office_id;

  -- Andar padrão (usa índice único por expressão)
  INSERT INTO floors (office_id, name)
  VALUES (default_office_id, '10')
  ON CONFLICT (office_id, LOWER(name)) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO default_floor_id;

  -- Migrar mapas existentes para a nova estrutura
  UPDATE maps
     SET floor_id = COALESCE(floor_id, default_floor_id),
         name = CASE
                  WHEN name IS NULL OR btrim(name) = '' THEN 'Renda Fixa e Derivativos'
                  WHEN LOWER(name) IN ('renda-fixa-derivativos', 'renda-fixa-e-derivativos') THEN 'Renda Fixa e Derivativos'
                  ELSE name
                END
   WHERE floor_id IS NULL
      OR LOWER(name) IN ('renda-fixa-derivativos', 'renda-fixa-e-derivativos');
END $$;

-- Normalizar nomes de andares existentes para conter apenas dígitos
UPDATE floors
   SET name = REGEXP_REPLACE(name, '\D', '', 'g')
 WHERE name ~ '\D'
   AND REGEXP_REPLACE(name, '\D', '', 'g') <> '';

-- 5) Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_offices_company_id ON offices(company_id);
CREATE INDEX IF NOT EXISTS idx_floors_office_id  ON floors(office_id);
CREATE INDEX IF NOT EXISTS idx_maps_floor_id     ON maps(floor_id);

-- 6) Remover colunas antigas se existirem (sem referenciá-las em UPDATE)
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

-- =====================================================
-- FIM
-- =====================================================
