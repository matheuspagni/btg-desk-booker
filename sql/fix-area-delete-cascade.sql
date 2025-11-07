-- =====================================================
-- CORREÇÃO: Ajustar FK de áreas nas mesas para ON DELETE SET NULL
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'desks_area_id_fkey'
    ) THEN
        ALTER TABLE public.desks DROP CONSTRAINT desks_area_id_fkey;
    END IF;
END $$;

ALTER TABLE public.desks 
ALTER COLUMN area_id DROP NOT NULL;

ALTER TABLE public.desks 
ADD CONSTRAINT desks_area_id_fkey 
FOREIGN KEY (area_id) 
REFERENCES public.areas(id) 
ON DELETE SET NULL;


