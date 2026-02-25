import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { showToast } from '../stores/toastStore'

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

// Modes: login, recovery, recovery-verify, recovery-pass
export default function Auth() {
  const [mode, setMode] = useState('login')
  const [phone, setPhone] = useState('+7')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')
  const [verifyUrl, setVerifyUrl] = useState('')
  const pollingRef = useRef(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  // Polling for Telegram verification
  useEffect(() => {
    if (mode !== 'recovery-verify' || !verifyToken) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/check-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: verifyToken }),
        })
        const data = await res.json()
        if (data.verified) {
          clearInterval(pollingRef.current)
          setMode('recovery-pass')
        }
      } catch {}
    }, 3000)

    return () => clearInterval(pollingRef.current)
  }, [mode, verifyToken])

  const resetError = useCallback(() => setError(''), [])

  // --- LOGIN ---
  async function handleLogin(e) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) return setError('Введите номер телефона')
    if (!password) return setError('Введите пароль')
    setLoading(true)
    resetError()
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: digits, пароль: password }),
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

  // --- RECOVERY: Create Telegram verify token ---
  async function handleRecoveryTelegram() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 11) return setError('Введите корректный номер')
    setLoading(true)
    resetError()
    try {
      const res = await fetch('/api/create-verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          тип: 'recovery',
          данные: { телефон: digits },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка запроса')
      setVerifyToken(data.token)
      setVerifyUrl(data.verify_url)
      setMode('recovery-verify')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- RESET PASSWORD ---
  async function handleResetPassword(e) {
    e.preventDefault()
    if (newPassword.length < 6) return setError('Минимум 6 символов')
    if (newPassword !== newPasswordRepeat) return setError('Пароли не совпадают')
    setLoading(true)
    resetError()
    try {
      const digits = phone.replace(/\D/g, '')
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          телефон: digits,
          пароль: newPassword,
          verify_token: verifyToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка сброса пароля')
      showToast('Пароль успешно изменён', 'success')
      setMode('login')
      setPassword('')
      setNewPassword('')
      setNewPasswordRepeat('')
      setVerifyToken('')
      setVerifyUrl('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    'login': 'Вход',
    'recovery': 'Восстановление',
    'recovery-verify': 'Подтверждение',
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
                if (mode === 'recovery-verify') {
                  clearInterval(pollingRef.current)
                  setMode('recovery')
                } else if (mode === 'recovery-pass') {
                  setMode('recovery')
                } else {
                  setMode('login')
                }
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
                <Input
                  placeholder="+7 (900) 123-45-67"
                  value={phone}
                  onChange={(v) => setPhone(formatPhone(v))}
                  type="tel"
                />
                <Input placeholder="Пароль" value={password} onChange={setPassword} type="password" />
                {error && <ErrorMsg text={error} />}
                <GoldBtn text={loading ? 'ЗАГРУЗКА...' : 'ВОЙТИ'} disabled={loading} />
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding')}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--gold)]"
                  >
                    Регистрация
                  </button>
                  <button
                    type="button"
                    onClick={() => { resetError(); setMode('recovery') }}
                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--gold)]"
                  >
                    Забыли пароль?
                  </button>
                </div>
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
                <GoldBtn
                  text={loading ? 'ОТПРАВКА...' : 'ВОССТАНОВИТЬ ЧЕРЕЗ TELEGRAM'}
                  disabled={loading}
                  onClick={handleRecoveryTelegram}
                />
              </div>
            )}

            {/* RECOVERY: TELEGRAM VERIFY */}
            {mode === 'recovery-verify' && (
              <div className="space-y-4 text-center">
                <p className="text-[11px] text-[var(--text-muted)]">
                  Подтвердите личность через Telegram
                </p>

                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full gold-gradient-bg text-[var(--bg-dark)] font-bold text-[12px] tracking-[2px] py-4 rounded-[14px] press-effect text-center"
                >
                  ОТКРЫТЬ TELEGRAM
                </a>

                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Ожидание подтверждения...
                  </span>
                </div>

                <p className="text-[10px] text-[var(--text-muted)]">
                  Нажмите кнопку выше, затем подтвердите в боте @TTS_SHOP_BOT
                </p>
              </div>
            )}

            {/* RECOVERY: NEW PASSWORD */}
            {mode === 'recovery-pass' && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-[11px] text-[var(--text-muted)] text-center mb-2">
                  Установите новый пароль (минимум 6 символов)
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
