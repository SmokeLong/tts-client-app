import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// SHA-256 хеш
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const API = window.location.hostname === 'localhost' ? '' : ''

function Auth() {
  const navigate = useNavigate()
  const { setClient } = useApp()

  // Режимы: login, register-tg, register-phone, register-sms, register-credentials, recovery, recovery-sms, recovery-pass
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Поля
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [newLogin, setNewLogin] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordRepeat, setNewPasswordRepeat] = useState('')
  const [tgData, setTgData] = useState(null)
  const [countdown, setCountdown] = useState(0)

  // Таймер SMS
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  // Telegram Login callback
  const handleTelegramAuth = useCallback((user) => {
    setTgData(user)
    setMode('register-phone')
    setError('')
  }, [])

  // Подключаем Telegram виджет
  useEffect(() => {
    if (mode === 'register-tg') {
      window.onTelegramAuth = handleTelegramAuth
      const container = document.getElementById('tg-login')
      if (container) {
        container.innerHTML = ''
        const script = document.createElement('script')
        script.src = 'https://telegram.org/js/telegram-widget.js?22'
        script.setAttribute('data-telegram-login', 'TTS_SHOP_BOT')
        script.setAttribute('data-size', 'large')
        script.setAttribute('data-radius', '12')
        script.setAttribute('data-onauth', 'onTelegramAuth(user)')
        script.setAttribute('data-request-access', 'write')
        script.async = true
        container.appendChild(script)
      }
    }
  }, [mode, handleTelegramAuth])

  // === ЛОГИН ===
  const handleLogin = async () => {
    if (!login || !password) { setError('Заполните все поля'); return }
    setLoading(true); setError('')
    try {
      const hash = await hashPassword(password)
      const res = await fetch(API + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ логин: login, пароль_хеш: hash })
      })
      const data = await res.json()
      if (data.success) {
        setClient(data.client)
        localStorage.setItem('tts_client_data', JSON.stringify(data.client))
        localStorage.setItem('tts_auth_token', JSON.stringify({ login, hash, clientId: data.client.id }))
        navigate('/')
      } else {
        setError(data.error || 'Неверный логин или пароль')
      }
    } catch (err) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  // === SMS ===
  const sendSms = async (targetPhone) => {
    const ph = targetPhone || phone
    if (!ph || ph.replace(/\D/g, '').length < 11) { setError('Введите корректный номер'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(API + '/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: ph.replace(/\D/g, '') })
      })
      const data = await res.json()
      if (data.success) {
        if (mode === 'register-phone') setMode('register-sms')
        else if (mode === 'recovery') setMode('recovery-sms')
        setCountdown(60)
      } else {
        setError(data.error || 'Ошибка отправки')
      }
    } catch (err) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const verifySms = async () => {
    if (!smsCode || smsCode.length < 4) { setError('Введите 4-значный код'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(API + '/api/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: phone.replace(/\D/g, ''), код: smsCode })
      })
      const data = await res.json()
      if (data.success) {
        if (mode === 'register-sms') setMode('register-credentials')
        else if (mode === 'recovery-sms') setMode('recovery-pass')
        setError('')
      } else {
        setError(data.error || 'Неверный код')
      }
    } catch (err) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  // === РЕГИСТРАЦИЯ: создание логина/пароля ===
  const handleRegister = async () => {
    if (!newLogin || !newPassword) { setError('Заполните все поля'); return }
    if (newLogin.length < 3) { setError('Логин минимум 3 символа'); return }
    if (newPassword.length < 4) { setError('Пароль минимум 4 символа'); return }
    if (newPassword !== newPasswordRepeat) { setError('Пароли не совпадают'); return }
    setLoading(true); setError('')
    try {
      const hash = await hashPassword(newPassword)
      const res = await fetch(API + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          логин: newLogin,
          пароль_хеш: hash,
          телефон: phone.replace(/\D/g, ''),
          имя: tgData?.first_name || newLogin,
          telegram_id: tgData?.id || null,
          telegram_username: tgData?.username || null,
        })
      })
      const data = await res.json()
      if (data.success) {
        setClient(data.client)
        localStorage.setItem('tts_client_data', JSON.stringify(data.client))
        localStorage.setItem('tts_auth_token', JSON.stringify({ login: newLogin, hash, clientId: data.client.id }))
        navigate('/')
      } else {
        setError(data.error || 'Ошибка регистрации')
      }
    } catch (err) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  // === ВОССТАНОВЛЕНИЕ ===
  const handleRecovery = async () => {
    if (!newPassword) { setError('Введите новый пароль'); return }
    if (newPassword.length < 4) { setError('Пароль минимум 4 символа'); return }
    if (newPassword !== newPasswordRepeat) { setError('Пароли не совпадают'); return }
    setLoading(true); setError('')
    try {
      const hash = await hashPassword(newPassword)
      // Обновляем пароль через API login check by phone
      const res = await fetch(API + '/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          логин: login,
          пароль_хеш: hash,
          телефон: phone.replace(/\D/g, ''),
          имя: login,
        })
      })
      const data = await res.json()
      if (data.success) {
        setClient(data.client)
        localStorage.setItem('tts_client_data', JSON.stringify(data.client))
        localStorage.setItem('tts_auth_token', JSON.stringify({ login, hash, clientId: data.client.id }))
        navigate('/')
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  // Форматирование телефона
  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 0) return ''
    let formatted = '+7'
    if (digits.length > 1) formatted += ' (' + digits.slice(1, 4)
    if (digits.length > 4) formatted += ') ' + digits.slice(4, 7)
    if (digits.length > 7) formatted += '-' + digits.slice(7, 9)
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11)
    return formatted
  }

  return (
    <div className="min-h-screen bg-tts-dark flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Логотип */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-tts-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl font-bold text-white">TTS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">TTS Shop</h1>
        </div>

        {/* === ЛОГИН === */}
        {mode === 'login' && (
          <div className="space-y-4">
            <div>
              <label className="text-tts-muted text-sm mb-1 block">Логин</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Ваш логин"
                autoComplete="username"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>
            <div>
              <label className="text-tts-muted text-sm mb-1 block">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ваш пароль"
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={handleLogin} disabled={loading} className="w-full py-4 rounded-xl font-medium bg-tts-primary text-white active:scale-95 transition-all disabled:opacity-50">
              {loading ? 'Входим...' : 'Войти'}
            </button>

            <div className="flex justify-between">
              <button onClick={() => { setMode('recovery'); setError('') }} className="text-tts-muted text-sm">Забыли пароль?</button>
              <button onClick={() => { setMode('register-tg'); setError('') }} className="text-tts-primary text-sm font-medium">Регистрация</button>
            </div>

            <div className="border-t border-tts-card pt-4">
              <button onClick={() => navigate('/')} className="w-full py-3 rounded-xl text-tts-muted bg-tts-card text-center">
                Продолжить без входа
              </button>
            </div>
          </div>
        )}

        {/* === РЕГИСТРАЦИЯ: Telegram === */}
        {mode === 'register-tg' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Регистрация</h2>
            <p className="text-tts-muted text-sm text-center">Шаг 1/4: Подтвердите Telegram</p>

            <div className="bg-tts-card rounded-2xl p-6 flex flex-col items-center">
              <p className="text-white text-sm mb-4 text-center">Нажмите кнопку для входа через Telegram</p>
              <div id="tg-login" className="flex justify-center"></div>
            </div>

            <button onClick={() => { setMode('login'); setError('') }} className="w-full py-3 rounded-xl text-tts-muted bg-tts-card text-center">
              ← Назад к входу
            </button>
          </div>
        )}

        {/* === РЕГИСТРАЦИЯ: Телефон === */}
        {mode === 'register-phone' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Регистрация</h2>
            <p className="text-tts-muted text-sm text-center">Шаг 2/4: Введите номер телефона</p>

            {tgData && (
              <div className="bg-tts-success/10 rounded-xl p-3 text-center">
                <p className="text-tts-success text-sm">✅ Telegram подтверждён: {tgData.first_name} (@{tgData.username})</p>
              </div>
            )}

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="+7 (900) 123-45-67"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary text-lg"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={() => sendSms()} disabled={loading} className="w-full py-4 rounded-xl font-medium bg-tts-primary text-white active:scale-95 disabled:opacity-50">
              {loading ? 'Отправляем...' : 'Получить SMS код'}
            </button>

            <button onClick={() => { setMode('register-tg'); setError('') }} className="w-full py-3 rounded-xl text-tts-muted bg-tts-card text-center">
              ← Назад
            </button>
          </div>
        )}

        {/* === РЕГИСТРАЦИЯ: SMS код === */}
        {(mode === 'register-sms' || mode === 'recovery-sms') && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">
              {mode === 'register-sms' ? 'Регистрация' : 'Восстановление'}
            </h2>
            <p className="text-tts-muted text-sm text-center">
              {mode === 'register-sms' ? 'Шаг 3/4' : 'Шаг 2/3'}: Введите код из SMS
            </p>

            <div className="bg-tts-card rounded-2xl p-4 text-center">
              <p className="text-tts-muted text-sm">Код отправлен на</p>
              <p className="text-white font-medium">{phone}</p>
            </div>

            <div>
              <input
                type="number"
                value={smsCode}
                onChange={e => setSmsCode(e.target.value.slice(0, 4))}
                placeholder="Код из SMS"
                inputMode="numeric"
                autoFocus
                className="w-full bg-tts-card text-white py-4 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary text-2xl text-center tracking-[0.5em]"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={verifySms} disabled={loading || smsCode.length < 4} className="w-full py-4 rounded-xl font-medium bg-tts-primary text-white active:scale-95 disabled:opacity-50">
              {loading ? 'Проверяем...' : 'Подтвердить'}
            </button>

            <button onClick={() => sendSms()} disabled={countdown > 0 || loading} className="w-full py-3 rounded-xl text-tts-muted bg-tts-card text-center disabled:opacity-50">
              {countdown > 0 ? `Повторно через ${countdown}с` : 'Отправить ещё раз'}
            </button>
          </div>
        )}

        {/* === РЕГИСТРАЦИЯ: Логин и пароль === */}
        {mode === 'register-credentials' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Регистрация</h2>
            <p className="text-tts-muted text-sm text-center">Шаг 4/4: Создайте логин и пароль</p>

            <div className="bg-tts-success/10 rounded-xl p-3 text-center">
              <p className="text-tts-success text-sm">✅ Телефон подтверждён</p>
            </div>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Придумайте логин</label>
              <input
                type="text"
                value={newLogin}
                onChange={e => setNewLogin(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="mylogin"
                autoComplete="username"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
              <p className="text-tts-muted text-xs mt-1">Латиница, цифры, подчёркивание</p>
            </div>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Придумайте пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                autoComplete="new-password"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Повторите пароль</label>
              <input
                type="password"
                value={newPasswordRepeat}
                onChange={e => setNewPasswordRepeat(e.target.value)}
                placeholder="Ещё раз"
                autoComplete="new-password"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={handleRegister} disabled={loading} className="w-full py-4 rounded-xl font-medium bg-tts-success text-white active:scale-95 disabled:opacity-50">
              {loading ? 'Создаём...' : '✅ Создать аккаунт'}
            </button>
          </div>
        )}

        {/* === ВОССТАНОВЛЕНИЕ: ввод логина и телефона === */}
        {mode === 'recovery' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Восстановление</h2>
            <p className="text-tts-muted text-sm text-center">Шаг 1/3: Введите логин и телефон</p>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Ваш логин</label>
              <input
                type="text"
                value={login}
                onChange={e => setLogin(e.target.value)}
                placeholder="Ваш логин"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Телефон при регистрации</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(formatPhone(e.target.value))}
                placeholder="+7 (900) 123-45-67"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={() => sendSms()} disabled={loading} className="w-full py-4 rounded-xl font-medium bg-tts-primary text-white active:scale-95 disabled:opacity-50">
              {loading ? 'Отправляем...' : 'Получить SMS код'}
            </button>

            <button onClick={() => { setMode('login'); setError('') }} className="w-full py-3 rounded-xl text-tts-muted bg-tts-card text-center">
              ← Назад к входу
            </button>
          </div>
        )}

        {/* === ВОССТАНОВЛЕНИЕ: новый пароль === */}
        {mode === 'recovery-pass' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white text-center">Новый пароль</h2>
            <p className="text-tts-muted text-sm text-center">Шаг 3/3: Придумайте новый пароль</p>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                autoComplete="new-password"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            <div>
              <label className="text-tts-muted text-sm mb-1 block">Повторите</label>
              <input
                type="password"
                value={newPasswordRepeat}
                onChange={e => setNewPasswordRepeat(e.target.value)}
                placeholder="Ещё раз"
                autoComplete="new-password"
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-tts-primary"
              />
            </div>

            {error && <p className="text-tts-danger text-sm text-center">{error}</p>}

            <button onClick={handleRecovery} disabled={loading} className="w-full py-4 rounded-xl font-medium bg-tts-success text-white active:scale-95 disabled:opacity-50">
              {loading ? 'Сохраняем...' : '✅ Сохранить пароль'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Auth
