import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { showToast } from '../stores/toastStore'

const SLIDES_DATA = [
  {
    type: 'welcome',
    tagline: 'Надёжное комьюнити с серьёзным подходом к делу',
    features: [
      { icon: '👑', title: 'ВЫСОЧАЙШЕЕ КАЧЕСТВО', desc: 'Обслуживания и продукции' },
      { icon: '📦', title: 'ШИРОКИЙ АССОРТИМЕНТ', desc: 'Со стабильным наличием' },
      { icon: '🎯', title: 'БЕСПЛАТНЫЙ ПРЕДЗАКАЗ', desc: 'Любой шайбы под вас' },
      { icon: '⚡', title: 'МАКСИМУМ УДОБСТВА', desc: 'Минимум напряжения' },
    ],
  },
  {
    type: 'info',
    icon: '💎',
    title: 'СИСТЕМА СКИДОК',
    desc: 'Чем больше покупаешь — тем больше экономишь. Накапливай сумму выкупа и получай постоянную скидку',
    features: [
      { icon: '3%', iconBg: 'rgba(74,222,128,0.15)', title: 'ОТ 24 000 ₽', desc: 'Скидка на все товары' },
      { icon: '5%', iconBg: 'rgba(74,222,128,0.15)', title: 'ОТ 44 000 ₽', desc: 'Скидка на все товары' },
      { icon: '10%', iconBg: 'rgba(74,222,128,0.15)', title: 'ОТ 59 000 ₽', desc: 'Максимальная скидка' },
    ],
  },
  {
    type: 'info',
    icon: '🪙',
    title: 'ТКОИНЫ',
    desc: 'Внутренняя валюта магазина. 1 ткоин = 1 рубль. Копи и трать на покупки',
    features: [
      { icon: '🎁', title: 'КЭШБЭК 1.5%', desc: 'С каждой покупки' },
      { icon: '🎲', title: 'КУБИК УДАЧИ', desc: 'Выиграй скидку 15% или 50%' },
      { icon: '👥', title: 'ПРИГЛАШАЙ ДРУЗЕЙ', desc: '+100 ткоинов за каждого' },
    ],
  },
  {
    type: 'register',
  },
]

function calcAge(dobStr) {
  if (!dobStr || dobStr.length < 10) return null
  const parts = dobStr.split('.')
  if (parts.length !== 3) return null
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  if (!day || !month || !year || year < 1900 || year > 2100) return null
  const birth = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export default function Onboarding() {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Registration data
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [personalDataConsent, setPersonalDataConsent] = useState(false)
  const [notificationsConsent, setNotificationsConsent] = useState(false)

  // Registration multi-step: data → sms → password → telegram
  const [regStep, setRegStep] = useState('data')
  const [smsCode, setSmsCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [telegramOpened, setTelegramOpened] = useState(false)
  const [uniqueNumber, setUniqueNumber] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const containerRef = useRef(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  // Generate unique number on mount
  useEffect(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const num = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * 26)]).join('') + Math.floor(Math.random() * 10)
    setUniqueNumber(num)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  function handlePhoneChange(e) {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.startsWith('8')) v = '7' + v.slice(1)
    if (!v.startsWith('7') && v.length > 0) v = '7' + v
    let formatted = ''
    if (v.length > 0) formatted = '+' + v[0]
    if (v.length > 1) formatted += ' (' + v.slice(1, 4)
    if (v.length > 4) formatted += ') ' + v.slice(4, 7)
    if (v.length > 7) formatted += '-' + v.slice(7, 9)
    if (v.length > 9) formatted += '-' + v.slice(9, 11)
    setPhone(formatted)
  }

  function handleDobChange(e) {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 8) v = v.slice(0, 8)
    if (v.length >= 5) v = v.slice(0, 2) + '.' + v.slice(2, 4) + '.' + v.slice(4)
    else if (v.length >= 3) v = v.slice(0, 2) + '.' + v.slice(2)
    setDob(v)
  }

  function goToSlide(n) {
    setCurrentSlide(n)
  }

  function nextSlide() {
    if (currentSlide < 3) goToSlide(currentSlide + 1)
  }

  const phoneDigits = phone.replace(/\D/g, '')
  const phoneValid = phoneDigits.length === 11
  const dobAge = calcAge(dob)
  const isUnderage = dob.length === 10 && dobAge !== null && dobAge < 18
  const canProceedData = name.trim() && phoneValid && ageConfirmed && personalDataConsent && !isUnderage && !loading

  // Step: data → sms
  async function handleSendSms() {
    if (!name.trim()) return setError('Введите имя')
    if (!phoneValid) return setError('Введите номер телефона')
    if (!ageConfirmed) return setError('Подтвердите возраст')
    if (!personalDataConsent) return setError('Необходимо согласие на обработку данных')
    if (isUnderage) return setError('Регистрация доступна только лицам старше 18 лет')

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: phoneDigits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки SMS')
      setCountdown(60)
      setRegStep('sms')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Resend SMS
  async function handleResendSms() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: phoneDigits }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки SMS')
      setCountdown(60)
      setSmsCode('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step: sms → password
  async function handleVerifySms() {
    if (smsCode.length !== 4) return setError('Введите 4-значный код')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ телефон: phoneDigits, код: smsCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Неверный код')
      setRegStep('password')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Step: password → telegram
  function handlePasswordNext() {
    if (password.length < 6) return setError('Минимум 6 символов')
    if (password !== passwordConfirm) return setError('Пароли не совпадают')
    setError('')
    setRegStep('telegram')
  }

  // Final: register
  async function handleRegister() {
    setLoading(true)
    setError('')
    try {
      const dobFormatted = dob && dob.length === 10 ? dob.split('.').reverse().join('-') : null

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          телефон: phoneDigits,
          пароль: password,
          имя: name.trim(),
          дата_рождения: dobFormatted,
          уникальный_номер: uniqueNumber,
          согласие_на_обработку: personalDataConsent,
          согласие_на_уведомления: notificationsConsent,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка регистрации')

      setAuth('session_' + Date.now(), data.client)
      showToast('Добро пожаловать!', 'success')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenTelegram() {
    window.open(`https://t.me/TTS_SHOP_BOT?start=REF_${uniqueNumber}`, '_blank')
    setTelegramOpened(true)
  }

  // Touch swipe support
  const touchStartX = useRef(0)
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    if (currentSlide === 3) return // No swipe on registration
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < 3) goToSlide(currentSlide + 1)
      if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1)
    }
  }

  // Registration step progress
  const regSteps = ['data', 'sms', 'password', 'telegram']
  const regStepIndex = regSteps.indexOf(regStep)

  return (
    <div className="min-h-screen leather-bg overflow-hidden">
      <div className="max-w-app mx-auto min-h-screen relative overflow-hidden">
        <div
          ref={containerRef}
          className="flex transition-transform duration-500 ease-out min-h-screen"
          style={{ width: '400%', transform: `translateX(-${currentSlide * 25}%)` }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slide 1: Welcome */}
          <div className="w-1/4 min-h-screen flex flex-col overflow-y-auto px-6 pt-10 pb-10">
            <div className="flex justify-center py-6 animate-logoPulse">
              <img src="/assets/logo.png" alt="Time to Snus" className="w-[220px] h-auto" />
            </div>
            <p className="text-[13px] font-bold text-[var(--gold-light)] text-center leading-relaxed mb-5 tracking-wide">
              {SLIDES_DATA[0].tagline}
            </p>
            <div className="flex flex-col gap-3 mt-2">
              {SLIDES_DATA[0].features.map((f) => (
                <div key={f.title} className="flex items-center gap-3.5 p-3.5 card">
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[20px] shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[var(--gold-light)]">{f.title}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <SlideBottom
              current={currentSlide}
              onNext={nextSlide}
              onSkip={() => goToSlide(3)}
              onDot={goToSlide}
              buttonText="ДАЛЕЕ"
              showSkip
            />
          </div>

          {/* Slide 2: Discounts */}
          <div className="w-1/4 min-h-screen flex flex-col overflow-y-auto px-6 pt-10 pb-10">
            <SlideIcon emoji={SLIDES_DATA[1].icon} />
            <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-4">
              {SLIDES_DATA[1].title}
            </h2>
            <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed max-w-[280px] mx-auto">
              {SLIDES_DATA[1].desc}
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {SLIDES_DATA[1].features.map((f) => (
                <div key={f.title} className="flex items-center gap-3.5 p-3.5 card">
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[14px] font-bold text-[var(--green)] shrink-0"
                    style={{ background: f.iconBg || 'rgba(212,175,55,0.1)' }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[var(--gold-light)]">{f.title}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <SlideBottom
              current={currentSlide}
              onNext={nextSlide}
              onSkip={() => goToSlide(3)}
              onDot={goToSlide}
              buttonText="ДАЛЕЕ"
              showSkip
            />
          </div>

          {/* Slide 3: TCoins */}
          <div className="w-1/4 min-h-screen flex flex-col overflow-y-auto px-6 pt-10 pb-10">
            <SlideIcon emoji={SLIDES_DATA[2].icon} />
            <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-4">
              {SLIDES_DATA[2].title}
            </h2>
            <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed max-w-[280px] mx-auto">
              {SLIDES_DATA[2].desc}
            </p>
            <div className="flex flex-col gap-3 mt-6">
              {SLIDES_DATA[2].features.map((f) => (
                <div key={f.title} className="flex items-center gap-3.5 p-3.5 card">
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center text-[20px] shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-[var(--gold-light)]">{f.title}</div>
                    <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <SlideBottom
              current={currentSlide}
              onNext={nextSlide}
              onSkip={() => goToSlide(3)}
              onDot={goToSlide}
              buttonText="ДАЛЕЕ"
              showSkip
            />
          </div>

          {/* Slide 4: Registration (multi-step) */}
          <div className="w-1/4 min-h-screen flex flex-col overflow-y-auto px-6 pt-8 pb-10">
            {/* Step progress bar */}
            <div className="flex gap-1.5 mb-6 px-2">
              {regSteps.map((step, i) => (
                <div
                  key={step}
                  className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                    i <= regStepIndex ? 'bg-[var(--gold)]' : 'bg-[var(--border-gold)]'
                  }`}
                />
              ))}
            </div>

            {/* Sub-step: DATA */}
            {regStep === 'data' && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-2">
                  РЕГИСТРАЦИЯ
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed max-w-[280px] mx-auto mb-6">
                  Укажи данные для персональных скидок и бонусов
                </p>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] tracking-[1px]">ИМЯ</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Как тебя зовут?"
                      className="py-3.5 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] tracking-[1px]">ТЕЛЕФОН</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="+7 (900) 123-45-67"
                      className="py-3.5 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] tracking-[1px]">ДАТА РОЖДЕНИЯ</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={dob}
                      onChange={handleDobChange}
                      placeholder="ДД.ММ.ГГГГ"
                      maxLength={10}
                      className="py-3.5 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                    />
                  </div>

                  {isUnderage && (
                    <p className="text-[10px] text-[var(--red)] text-center mt-1">
                      Регистрация доступна только лицам старше 18 лет
                    </p>
                  )}

                  <OnboardingCheckbox
                    checked={ageConfirmed}
                    onChange={() => setAgeConfirmed(!ageConfirmed)}
                    label="Мне есть 18 лет"
                    sublabel="Продажа никотиносодержащей продукции лицам младше 18 лет запрещена"
                  />
                  <OnboardingCheckbox
                    checked={personalDataConsent}
                    onChange={() => setPersonalDataConsent(!personalDataConsent)}
                    label="Согласен на обработку персональных данных"
                  />
                  <OnboardingCheckbox
                    checked={notificationsConsent}
                    onChange={() => setNotificationsConsent(!notificationsConsent)}
                    label="Хочу получать уведомления о поступлении моих любимых позиций"
                    optional
                  />
                </div>

                {error && <p className="text-[10px] text-[var(--red)] text-center mt-3">{error}</p>}

                <div className="mt-auto">
                  <div className="flex justify-center gap-2.5 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`h-[10px] rounded-full transition-all duration-300 ${
                          i === 3
                            ? 'w-[30px] bg-[var(--gold)]'
                            : 'w-[10px] bg-[var(--border-gold)]'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleSendSms}
                    disabled={!canProceedData}
                    className={`w-full py-4 rounded-[14px] gold-gradient-bg text-[var(--bg-dark)] font-bold text-[13px] tracking-[2px] press-effect transition-opacity ${
                      !canProceedData ? 'opacity-50 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {loading ? 'ОТПРАВКА...' : 'ДАЛЕЕ'}
                  </button>
                  <button
                    onClick={() => navigate('/auth')}
                    className="block w-full text-center mt-4 text-[11px] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
                  >
                    Уже есть аккаунт? Войти
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step: SMS */}
            {regStep === 'sms' && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                <button
                  onClick={() => { setRegStep('data'); setError('') }}
                  className="self-start mb-4 press-effect p-1"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <div className="w-[80px] h-[80px] mx-auto mb-5 rounded-full bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>

                <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-2">
                  ПОДТВЕРЖДЕНИЕ
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed mb-8">
                  Код отправлен на {phone}
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="0000"
                  autoFocus
                  className="w-[200px] mx-auto text-center text-[32px] tracking-[16px] font-bold py-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                />

                {error && <p className="text-[10px] text-[var(--red)] text-center mt-4">{error}</p>}

                <div className="text-center mt-6">
                  {countdown > 0 ? (
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Отправить повторно через {countdown}с
                    </span>
                  ) : (
                    <button
                      onClick={handleResendSms}
                      disabled={loading}
                      className="text-[10px] text-[var(--gold)] hover:text-[var(--gold-light)]"
                    >
                      Отправить повторно
                    </button>
                  )}
                </div>

                <div className="mt-auto">
                  <button
                    onClick={handleVerifySms}
                    disabled={smsCode.length !== 4 || loading}
                    className={`w-full py-4 rounded-[14px] gold-gradient-bg text-[var(--bg-dark)] font-bold text-[13px] tracking-[2px] press-effect transition-opacity ${
                      smsCode.length !== 4 || loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {loading ? 'ПРОВЕРКА...' : 'ПОДТВЕРДИТЬ'}
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step: PASSWORD */}
            {regStep === 'password' && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                <div className="w-[80px] h-[80px] mx-auto mt-4 mb-5 rounded-full bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>

                <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-2">
                  ПРИДУМАЙТЕ ПАРОЛЬ
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed mb-6">
                  Минимум 6 символов. Этот пароль понадобится для входа
                </p>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] tracking-[1px]">ПАРОЛЬ</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError('') }}
                      placeholder="Минимум 6 символов"
                      className="py-3.5 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-[var(--text-muted)] tracking-[1px]">ПОВТОРИТЕ ПАРОЛЬ</span>
                    <input
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => { setPasswordConfirm(e.target.value); setError('') }}
                      placeholder="Повторите пароль"
                      className="py-3.5 px-4 bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-xl text-[13px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                    />
                  </div>
                </div>

                {/* Password strength */}
                {password && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 flex gap-1">
                      <div className={`flex-1 h-1 rounded-full ${password.length >= 6 ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`} />
                      <div className={`flex-1 h-1 rounded-full ${password.length >= 8 ? 'bg-[var(--green)]' : 'bg-[var(--border-gold)]'}`} />
                      <div className={`flex-1 h-1 rounded-full ${password.length >= 10 ? 'bg-[var(--green)]' : 'bg-[var(--border-gold)]'}`} />
                    </div>
                    <span className={`text-[9px] ${password.length >= 6 ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
                      {password.length < 6 ? 'Слишком короткий' : password.length < 8 ? 'Нормальный' : 'Надёжный'}
                    </span>
                  </div>
                )}

                {error && <p className="text-[10px] text-[var(--red)] text-center mt-3">{error}</p>}

                <div className="mt-auto">
                  <button
                    onClick={handlePasswordNext}
                    disabled={password.length < 6 || !passwordConfirm}
                    className={`w-full py-4 rounded-[14px] gold-gradient-bg text-[var(--bg-dark)] font-bold text-[13px] tracking-[2px] press-effect transition-opacity ${
                      password.length < 6 || !passwordConfirm ? 'opacity-50 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    ДАЛЕЕ
                  </button>
                </div>
              </div>
            )}

            {/* Sub-step: TELEGRAM */}
            {regStep === 'telegram' && (
              <div className="flex flex-col flex-1 animate-fadeIn">
                <div className="w-[80px] h-[80px] mx-auto mt-4 mb-5 rounded-full bg-[rgba(96,165,250,0.15)] border border-[rgba(96,165,250,0.3)] flex items-center justify-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#60a5fa">
                    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-2.01 9.47c-.15.68-.54.85-1.09.53l-3.01-2.22-1.45 1.4c-.16.16-.3.3-.61.3l.22-3.04 5.55-5.01c.24-.22-.05-.33-.37-.14L8.6 14.22l-2.94-.92c-.64-.2-.65-.64.13-.95l11.47-4.42c.53-.2 1 .13.83.95l-.15-.75z"/>
                  </svg>
                </div>

                <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mb-2">
                  ПРИВЯЖИТЕ TELEGRAM
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] text-center leading-relaxed max-w-[280px] mx-auto mb-8">
                  Привяжите Telegram для уведомлений о статусе заказов и акциях
                </p>

                {!telegramOpened ? (
                  <button
                    onClick={handleOpenTelegram}
                    className="w-full py-4 rounded-[14px] bg-[#2AABEE] text-white font-bold text-[13px] tracking-[1px] press-effect flex items-center justify-center gap-2.5"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.13l-2.01 9.47c-.15.68-.54.85-1.09.53l-3.01-2.22-1.45 1.4c-.16.16-.3.3-.61.3l.22-3.04 5.55-5.01c.24-.22-.05-.33-.37-.14L8.6 14.22l-2.94-.92c-.64-.2-.65-.64.13-.95l11.47-4.42c.53-.2 1 .13.83.95l-.15-.75z"/>
                    </svg>
                    ПЕРЕЙТИ В БОТА
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-4 text-[var(--green)]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-[11px] font-bold">Ссылка открыта</span>
                    </div>
                    <button
                      onClick={handleRegister}
                      disabled={loading}
                      className={`w-full py-4 rounded-[14px] gold-gradient-bg text-[var(--bg-dark)] font-bold text-[13px] tracking-[2px] press-effect transition-opacity ${
                        loading ? 'opacity-50' : 'opacity-100'
                      }`}
                    >
                      {loading ? 'РЕГИСТРАЦИЯ...' : 'ЗАВЕРШИТЬ РЕГИСТРАЦИЮ'}
                    </button>
                  </>
                )}

                {error && <p className="text-[10px] text-[var(--red)] text-center mt-4">{error}</p>}

                <div className="mt-auto">
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="block w-full text-center text-[11px] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors py-2"
                  >
                    {loading ? 'Загрузка...' : 'Пропустить'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SlideIcon({ emoji }) {
  return (
    <div className="w-[140px] h-[140px] mx-auto mt-10 mb-6 rounded-full border-2 border-[var(--gold)] flex items-center justify-center text-[70px]"
      style={{
        background: 'linear-gradient(145deg, rgba(30,27,24,1), rgba(15,13,11,1))',
        boxShadow: '0 0 40px rgba(212,175,55,0.2)',
      }}
    >
      {emoji}
    </div>
  )
}

function OnboardingCheckbox({ checked, onChange, label, sublabel, optional }) {
  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-xl mt-2 transition-all duration-300 ${
        checked
          ? 'bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.3)]'
          : 'bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)]'
      }`}
    >
      <button
        onClick={onChange}
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          checked
            ? 'bg-[var(--green,#4ade80)] border-[var(--green,#4ade80)]'
            : 'bg-[rgba(248,113,113,0.15)] border-[rgba(248,113,113,0.4)]'
        }`}
      >
        {checked && (
          <span className="text-[14px] font-bold text-[var(--bg-dark)]">✓</span>
        )}
      </button>
      <div>
        <div className={`text-[10px] leading-relaxed font-bold ${checked ? 'text-[var(--green,#4ade80)]' : 'text-[var(--red)]'}`}>
          {label}
          {optional && <span className="font-normal text-[var(--text-muted)]"> (необязательно)</span>}
        </div>
        {sublabel && (
          <div className={`text-[9px] mt-0.5 ${checked ? 'text-[var(--text-muted)]' : 'text-[var(--red)]'} opacity-70`}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )
}

function SlideBottom({ current, onNext, onSkip, onDot, buttonText, showSkip, disabled }) {
  return (
    <div className="mt-auto">
      {/* Dots */}
      <div className="flex justify-center gap-2.5 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            onClick={() => onDot(i)}
            className={`h-[10px] rounded-full transition-all duration-300 ${
              i === current
                ? 'w-[30px] bg-[var(--gold)]'
                : 'w-[10px] bg-[var(--border-gold)]'
            }`}
          />
        ))}
      </div>

      {/* Button */}
      <button
        onClick={onNext}
        disabled={disabled}
        className={`w-full py-4 rounded-[14px] gold-gradient-bg text-[var(--bg-dark)] font-bold text-[13px] tracking-[2px] press-effect transition-opacity ${
          disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}
      >
        {buttonText}
      </button>

      {/* Skip */}
      {showSkip && (
        <button
          onClick={onSkip}
          className="block w-full text-center mt-4 text-[11px] text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors"
        >
          Пропустить
        </button>
      )}
    </div>
  )
}
