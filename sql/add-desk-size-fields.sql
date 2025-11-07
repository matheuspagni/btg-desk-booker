-- Adicionar campos de tamanho às mesas (em unidades de grid de 40px)
-- width_units: largura em unidades (padrão: 3 = 120px)
-- height_units: altura em unidades (padrão: 2 = 80px)

ALTER TABLE public.desks 
ADD COLUMN IF NOT EXISTS width_units INT DEFAULT 3,
ADD COLUMN IF NOT EXISTS height_units INT DEFAULT 2;

-- Atualizar mesas existentes para ter o tamanho padrão
UPDATE public.desks 
SET width_units = 3, height_units = 2 
WHERE width_units IS NULL OR height_units IS NULL;


