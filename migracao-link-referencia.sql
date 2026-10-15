-- ============================================================
-- Migração: adicionar link_referencia e ref_markers na tabela letras
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ============================================================

-- 1) Link de referência (YouTube / Spotify) — texto simples
ALTER TABLE letras ADD COLUMN IF NOT EXISTS link_referencia text;

-- 2) Marcadores de sincronia vídeo ↔ estrofe — array de JSON
--    Cada item: { "tempo": 42, "estrofe": 3 }
ALTER TABLE letras ADD COLUMN IF NOT EXISTS ref_markers jsonb DEFAULT '[]'::jsonb;

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'letras'
ORDER BY ordinal_position;
