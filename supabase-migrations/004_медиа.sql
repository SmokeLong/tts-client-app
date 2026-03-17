-- Таблица медиа: хранит фото для брендов и линеек
-- Тип: 'brand' — фото бренда, ключ = название бренда
-- Тип: 'lineup' — фото линейки, ключ = "бренд::линейка"

CREATE TABLE IF NOT EXISTS public."медиа" (
  id SERIAL PRIMARY KEY,
  "тип" TEXT NOT NULL CHECK ("тип" IN ('brand', 'lineup')),
  "ключ" TEXT NOT NULL,
  "фото_url" TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE("тип", "ключ")
);

ALTER TABLE public."медиа" ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Чтение медиа для всех" ON public."медиа"
  FOR SELECT USING (true);

-- Полный доступ для service_role
GRANT ALL ON public."медиа" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."медиа_id_seq" TO service_role;

-- Чтение для anon и authenticated
GRANT SELECT ON public."медиа" TO anon;
GRANT SELECT ON public."медиа" TO authenticated;
