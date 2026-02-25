-- Таблица для Telegram верификации (регистрация + восстановление пароля)
CREATE TABLE IF NOT EXISTS telegram_верификация (
  id BIGSERIAL PRIMARY KEY,
  токен TEXT UNIQUE NOT NULL,
  тип TEXT NOT NULL DEFAULT 'register',  -- 'register' or 'recovery'
  телефон TEXT NOT NULL,
  данные JSONB,
  telegram_id TEXT,
  telegram_username TEXT,
  подтверждён BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE telegram_верификация ENABLE ROW LEVEL SECURITY;

GRANT ALL ON telegram_верификация TO service_role;
GRANT USAGE, SELECT ON SEQUENCE telegram_верификация_id_seq TO service_role;
