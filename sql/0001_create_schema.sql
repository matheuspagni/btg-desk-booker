-- =====================================================
-- MIGRAÇÃO INICIAL - BTG DESK BOOKER (PostgreSQL)
-- Executar após configurar `SET search_path TO <schema>, public;`
-- Cria todas as estruturas necessárias para um schema vazio.
-- =====================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABELAS DE HIERARQUIA
-- =====================================================

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

CREATE INDEX IF NOT EXISTS idx_offices_company_id ON offices(company_id);

CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID NOT NULL REFERENCES offices(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS floors_office_name_lower_idx
  ON floors (office_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_floors_office_id ON floors(office_id);

CREATE TABLE IF NOT EXISTS maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS maps_floor_name_lower_idx
  ON maps (floor_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_maps_floor_id ON maps(floor_id);

-- =====================================================
-- TABELAS OPERACIONAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0ea5e9',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_areas_map_name_unique
  ON areas (map_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_areas_map_id ON areas(map_id);

CREATE TABLE IF NOT EXISTS desks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width_units INTEGER NOT NULL DEFAULT 3,
  height_units INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_desks_map_code_unique
  ON desks (map_id, UPPER(code));

CREATE INDEX IF NOT EXISTS idx_desks_map_id ON desks(map_id);
CREATE INDEX IF NOT EXISTS idx_desks_area_id ON desks(area_id);
CREATE INDEX IF NOT EXISTS idx_desks_is_active ON desks(is_active);

CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk_id UUID NOT NULL REFERENCES desks(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_days INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT reservations_desk_date_unique UNIQUE (desk_id, date)
    DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX IF NOT EXISTS idx_reservations_desk_id ON reservations(desk_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);

CREATE TABLE IF NOT EXISTS chairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  rotation INTEGER NOT NULL DEFAULT 0 CHECK (rotation BETWEEN 0 AND 3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chairs_map_position_unique
  ON chairs (map_id, x, y);

CREATE INDEX IF NOT EXISTS idx_chairs_map_id ON chairs(map_id);
CREATE INDEX IF NOT EXISTS idx_chairs_is_active ON chairs(is_active);

CREATE TABLE IF NOT EXISTS reservation_logs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('CREATE', 'DELETE', 'UPDATE')),
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  desk_id UUID REFERENCES desks(id) ON DELETE SET NULL,
  map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  reservation_date DATE,
  reservation_note VARCHAR(255),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_days INTEGER[],
  user_agent TEXT,
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  operating_system VARCHAR(100),
  device_type VARCHAR(50),
  screen_resolution VARCHAR(20),
  ip_address INET,
  timezone VARCHAR(50),
  computer_name VARCHAR(255),
  session_id VARCHAR(255),
  referrer_url TEXT,
  page_url TEXT,
  processing_time_ms INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  operation_details JSONB
);

CREATE INDEX IF NOT EXISTS idx_reservation_logs_created_at ON reservation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_operation_type ON reservation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_desk_id ON reservation_logs(desk_id);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_reservation_date ON reservation_logs(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_session_id ON reservation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_reservation_logs_map_id ON reservation_logs(map_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

INSERT INTO companies (name)
VALUES ('BTG Pactual')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- FIM
-- =====================================================

