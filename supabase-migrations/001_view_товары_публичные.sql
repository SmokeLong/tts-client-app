-- ============================================
-- 1. VIEW товары_публичные (без закупочная_цена)
-- ============================================
CREATE OR REPLACE VIEW товары_публичные AS
SELECT
  id,
  airtable_id,
  название,
  бренд,
  линейка,
  вкус,
  тип,
  формат_пакетов,
  крепость,
  категория_крепости,
  количество_пакетов,
  вес_нетто,
  страна,
  описание,
  фото_url,
  цена_безнал,
  цена_нал,
  активен,
  created_at,
  updated_at,
  тип_эффекта,
  тип_аромки,
  насыщенность_аромки,
  отдаёт_никотином,
  цвет_пакетов,
  влажность,
  текучесть,
  тип_материал,
  код_товара,
  аналоги_коды,
  популярность,
  рейтинг,
  категория
FROM товары;

-- Разрешаем anon и authenticated читать VIEW
GRANT SELECT ON товары_публичные TO anon;
GRANT SELECT ON товары_публичные TO authenticated;

-- Запрещаем anon прямой доступ к таблице товары
-- (service_role всегда обходит RLS и имеет полный доступ)
REVOKE SELECT ON товары FROM anon;
REVOKE SELECT ON товары FROM authenticated;

-- ============================================
-- 2. Таблица отзывы
-- ============================================
CREATE TABLE IF NOT EXISTS отзывы (
  id BIGSERIAL PRIMARY KEY,
  клиент_id BIGINT NOT NULL REFERENCES клиенты(id) ON DELETE CASCADE,
  товар_id BIGINT NOT NULL REFERENCES товары(id) ON DELETE CASCADE,
  оценка INTEGER NOT NULL CHECK (оценка >= 1 AND оценка <= 5),
  текст TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Один отзыв на товар от клиента
CREATE UNIQUE INDEX IF NOT EXISTS idx_отзывы_уникальность
  ON отзывы (клиент_id, товар_id);

-- RLS
ALTER TABLE отзывы ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Чтение отзывов для всех" ON отзывы
  FOR SELECT USING (true);

CREATE POLICY "Запись отзывов через service_role" ON отзывы
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Обновление отзывов через service_role" ON отзывы
  FOR UPDATE USING (true) WITH CHECK (true);

GRANT SELECT ON отзывы TO anon;
GRANT SELECT ON отзывы TO authenticated;
GRANT ALL ON отзывы TO service_role;
GRANT USAGE, SELECT ON SEQUENCE отзывы_id_seq TO service_role;

-- ============================================
-- 3. Функция пересчёта рейтинга и популярности
-- ============================================
CREATE OR REPLACE FUNCTION пересчёт_рейтинга_и_популярности()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Обнуляем значения для товаров без отзывов / заказов
  UPDATE товары SET рейтинг = 0 WHERE id NOT IN (SELECT DISTINCT товар_id FROM отзывы);
  UPDATE товары SET популярность = 0 WHERE id NOT IN (
    SELECT DISTINCT (item->>'id')::bigint
    FROM заказы, jsonb_array_elements(товары_json) AS item
    WHERE статус NOT IN ('Удалён', 'Отменён')
  );

  -- Рейтинг = средняя оценка из отзывов
  UPDATE товары t
  SET рейтинг = sub.avg_rating
  FROM (
    SELECT товар_id, ROUND(AVG(оценка)::numeric, 2) AS avg_rating
    FROM отзывы
    GROUP BY товар_id
  ) sub
  WHERE t.id = sub.товар_id;

  -- Популярность = кол-во завершённых заказов с этим товаром
  UPDATE товары t
  SET популярность = sub.order_count
  FROM (
    SELECT
      (item->>'id')::bigint AS товар_id,
      COUNT(DISTINCT з.id) AS order_count
    FROM заказы з, jsonb_array_elements(з.товары_json) AS item
    WHERE з.статус NOT IN ('Удалён', 'Отменён')
    GROUP BY (item->>'id')::bigint
  ) sub
  WHERE t.id = sub.товар_id;
END;
$$;
