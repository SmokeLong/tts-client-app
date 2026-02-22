import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 1) return '+7'
  const rest = digits.startsWith('7') ? digits.slice(1) : digits.startsWith('8') ? digits.slice(1) : digits
  let result = '+7'
  if (rest.length > 0) result += ' (' + rest.slice(0, 3)
  if (rest.length >= 3) result += ') '
  if (rest.length > 3) result += rest.slice(3, 6)
  if (rest.length > 6) result += '-' + rest.slice(6, 8)
  if (rest.length > 8) result += '-' + rest.slice(8, 10)
  return result
}

// Modes: login, register-phone, register-sms, register-credentials, recovery, recovery-sms, recovery-pass
export default function Auth() {
  const [mode, setMode] = useState('login')
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('+7')
  const [smsCode, setSmsCode] = useState('')
  const [newLogin, setNewLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const resetError = useCallback(() => setError(''), [])

  // --- LOGIN ---
  async function handleLogin(e) {
    e.preventDefault()
    if (!login || !password) return setError('Заполните все поля')
    setLoading(true)
    resetError()
    try {
      const passHash = await hashPassword(password)
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ логин: login, пароль_хеш: passHash }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка входа')
      setAuth('session_' + Date.now(), data.client)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- SEND SMS ---
  async function handleSendSms() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) return setError('Введите корректный номер')
    setLoading(true)
    resetError()
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: digits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки')
      setCountdown(60)
      setMode(mode === 'recovery' ? 'recovery-sms' : 'register-sms')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- VERIFY SMS ---
  async function handleVerifySms() {
    if (smsCode.length !== 4) return setError('Введите 4-значный код')
    const digits = phone.replace(/\D/g, '')
    setLoading(true)
    resetError()
    try {
      const res = await fetch('/api/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: digits, код: smsCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Неверный код')
      setMode(mode === 'recovery-sms' ? 'recovery-pass' : 'register-credentials')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- REGISTER ---
  async function handleRegister(e) {
    e.preventDefault()
    if (!newLogin || !newPassword) return setError('Заполните все поля')
    if (newPassword.length < 4) return setError('Минимум 4 символа')
    if (newPassword !== newPasswordRepeat) return setError('Пароли не совпадают')
    setLoading(true)
    resetError()
    try {
      const passHash = await hashPassword(newPassword)
      const digits = phone.replace(/\D/g, '')
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          логин: newLogin,
          пароль_хеш: passHash,
          телефон: digits,
          имя: name || null,
          telegram_id: null,
          telegram_username: null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации')
      setAuth('session_' + Date.now(), data.client)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Mode title
  const titles = {
    'login': 'Вход',
    'register-phone': 'Регистрация',
    'register-sms': 'Подтверждение',
    'register-credentials': 'Создание аккаунта',
    'recovery': 'Восстановление',
    'recovery-sms': 'Подтверждение',
    'recovery-pass': 'Новый пароль',
  }

  return (
    <div className="min-h-screen leather-bg flex flex-col">
      <div className="max-w-app mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[rgba(10,9,8,0.95)] backdrop-blur-xl border-b border-[var(--border-gold)]">
          <div className="flex items-center gap-3 px-4 py-3">
            {mode !== 'login' && (
              <button onClick={() => {
                resetError()
                if (mode === 'register-sms') setMode('register-phone')
                else if (mode === 'register-credentials') setMode('register-sms')
                else if (mode === 'recovery-sms') setMode('recovery')
                else if (mode === 'recovery-pass') setMode('recovery-sms')
                else setMode('login')
              }} className="press-effect p-1">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
            <h1 className="text-[14px] font-bold tracking-[2px] uppercase gold-gradient-text">
              {titles[mode]}
            </h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full animate-fadeIn">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="text-[36px] font-black gold-gradient-text tracking-[4px] mb-2">TTS</div>
            </div>

            {/* LOGIN */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-3">
                <Input placeholder="Логин" value={login} onChange={setLogin} />
                <Input placeholder="Пароль" value={password} onChange={setPassword} type="password" />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'ЗАГРУЗКА...' : 'ВОЙТИ'} disabled={loading} />
                <div className="flex justify-between pt-2">
                  <button type="button" onClick={() => { resetError(); setMode('register-phone') }} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--gold)]">
                    Регистрация
                  </button>
                  <button type="button" onClick={() => { resetError(); setMode('recovery') }} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--gold)]">
                    Забыли пароль?
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER: PHONE */}
            {mode === 'register-phone' && (
              <div className="space-y-3">
                <Input placeholder="Имя" value={name} onChange={setName} />
                <Input
                  placeholder="+7 (900) 123-45-67"
                  value={phone}
                  onChange={(v) => setPhone(formatPhone(v))}
                  type="tel"
                />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ КОД'} disabled={loading} onClick={handleSendSms} />
              </div>
            )}

            {/* REGISTER / RECOVERY: SMS */}
            {(mode === 'register-sms' || mode === 'recovery-sms') && (
              <div className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-2">
                  Код отправлен на {phone}
                </p>
                <Input
                  placeholder="Введите 4-значный код"
                  value={smsCode}
                  onChange={setSmsCode}
                  maxLength={4}
                  inputMode="numeric"
                  autoFocus
                />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'} disabled={loading} onClick={handleVerifySms} />
                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Повторная отправка через {countdown}с
                    </span>
                  ) : (
                    <button onClick={handleSendSms} className="text-[10px] text-[var(--gold)] hover:text-[var(--gold-light)]">
                      Отправить код повторно
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* REGISTER: CREDENTIALS */}
            {mode === 'register-credentials' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-2">
                  Придумайте логин и пароль для входа
                </p>
                <Input placeholder="Логин" value={newLogin} onChange={setNewLogin} />
                <Input placeholder="Пароль" value={newPassword} onChange={setNewPassword} type="password" />
                <Input placeholder="Повторите пароль" value={newPasswordRepeat} onChange={setNewPasswordRepeat} type="password" />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'РЕГИСТРАЦИЯ...' : 'ЗАРЕГИСТРИРОВАТЬСЯ'} disabled={loading} />
              </form>
            )}

            {/* RECOVERY: PHONE */}
            {mode === 'recovery' && (
              <div className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-2">
                  Введите номер телефона для восстановления
                </p>
                <Input
                  placeholder="+7 (900) 123-45-67"
                  value={phone}
                  onChange={(v) => setPhone(formatPhone(v))}
                  type="tel"
                />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'ОТПРАВКА...' : 'ПОЛУЧИТЬ КОД'} disabled={loading} onClick={handleSendSms} />
              </div>
            )}

            {/* RECOVERY: NEW PASSWORD */}
            {mode === 'recovery-pass' && (
              <form onSubmit={handleRegister} className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-2">
                  Установите новый пароль
                </p>
                <Input placeholder="Новый пароль" value={newPassword} onChange={setNewPassword} type="password" />
                <Input placeholder="Повторите пароль" value={newPasswordRepeat} onChange={setNewPasswordRepeat} type="password" />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'} disabled={loading} />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ placeholder, value, onChange, type = 'text', maxLength, inputMode, autoFocus }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      inputMode={inputMode}
      autoFocus={autoFocus}
      className="w-full bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl py-3.5 px-4 text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
    />
  )
}

function GoldBtn({ text, disabled, onClick }) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className="w-full gold-gradient-bg text-[var(--bg-dark)] font-bold text-[12px] tracking-[2px] py-4 rounded-[14px] press-effect disabled:opacity-50"
    >
      {text}
    </button>
  )
}

function ErrorMsg({ text }) {
  return <p className="text-[10px] text-[var(--red)] text-center">{text}</p>
}
