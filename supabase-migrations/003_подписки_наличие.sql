-- Таблица подписок на уведомления о наличии товара
CREATE TABLE IF NOT EXISTS подписки_наличие (
  id BIGSERIAL PRIMARY KEY,
  клиент_id BIGINT NOT NULL REFERENCES клиенты(id) ON DELETE CASCADE,
  товар_id BIGINT NOT NULL REFERENCES товары(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(клиент_id, товар_id)
);

ALTER TABLE подписки_наличие ENABLE ROW LEVEL SECURITY;

-- Разрешения для service_role
GRANT ALL ON подписки_наличие TO service_role;
GRANT USAGE, SELECT ON SEQUENCE подписки_наличие_id_seq TO service_role;

-- anon может читать/писать свои подписки
CREATE POLICY "anon_select_подписки" ON подписки_наличие FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_подписки" ON подписки_наличие FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_подписки" ON подписки_наличие FOR UPDATE TO anon USING (true);
CREATE POLICY "anon_delete_подписки" ON подписки_наличие FOR DELETE TO anon USING (true);
