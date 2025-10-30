-- =====================================================
-- HABILITAR FUNÇÃO EXEC NO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Habilitar extensão necessária
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar função exec para executar SQL dinâmico
CREATE OR REPLACE FUNCTION public.exec(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'OK';
END;
$$;

-- Dar permissões para a função
GRANT EXECUTE ON FUNCTION public.exec(text) TO anon;
GRANT EXECUTE ON FUNCTION public.exec(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec(text) TO service_role;

-- Verificar se a função foi criada
SELECT 'Função exec criada com sucesso!' as status;
