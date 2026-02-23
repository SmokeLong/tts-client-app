import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

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

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

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
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [personalDataConsent, setPersonalDataConsent] = useState(false)
  const [notificationsConsent, setNotificationsConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

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

  const dobAge = calcAge(dob)
  const isUnderage = dob.length === 10 && dobAge !== null && dobAge < 18
  const canSubmit = ageConfirmed && personalDataConsent && !isUnderage && !loading

  async function handleRegister() {
    if (!name.trim()) return setError('Введите имя')
    if (!ageConfirmed) return setError('Подтвердите возраст')
    if (!personalDataConsent) return setError('Необходимо согласие на обработку данных')
    if (isUnderage) return setError('Регистрация доступна только лицам старше 18 лет')

    setLoading(true)
    setError('')

    try {
      const login = 'user_' + Date.now().toString(36)
      const password = Math.random().toString(36).slice(2, 10)
      const passwordHash = await hashPassword(password)
      // Format: 4 uppercase letters + 1 digit (e.g. ADSX3)
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const uniqueNum = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * 26)]).join('') + Math.floor(Math.random() * 10)

      const { data, error: dbError } = await supabase
        .from('клиенты')
        .insert({
          логин: login,
          пароль_хеш: passwordHash,
          имя: name.trim(),
          дата_рождения: dob || null,
          telegram_id: Date.now(),
          уникальный_номер: uniqueNum,
          дата_регистрации: new Date().toISOString(),
          статус: 'Активен',
          баланс_ткоинов: 0,
          сумма_всех_покупок: 0,
          количество_покупок: 0,
          согласие_на_обработку: personalDataConsent,
          согласие_на_уведомления: notificationsConsent,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setAuth('session_' + Date.now(), data)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Touch swipe support
  const touchStartX = useRef(0)
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e) {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentSlide < 3) goToSlide(currentSlide + 1)
      if (diff < 0 && currentSlide > 0) goToSlide(currentSlide - 1)
    }
  }

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

          {/* Slide 4: Registration */}
          <div className="w-1/4 min-h-screen flex flex-col overflow-y-auto px-6 pt-10 pb-10">
            <h2 className="text-[22px] font-extrabold text-[var(--gold-light)] text-center tracking-[2px] mt-5 mb-4">
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

              {/* Checkbox 1: Age confirmation */}
              <OnboardingCheckbox
                checked={ageConfirmed}
                onChange={() => setAgeConfirmed(!ageConfirmed)}
                label="Мне есть 18 лет"
                sublabel="Продажа никотиносодержащей продукции лицам младше 18 лет запрещена"
              />

              {/* Checkbox 2: Personal data consent */}
              <OnboardingCheckbox
                checked={personalDataConsent}
                onChange={() => setPersonalDataConsent(!personalDataConsent)}
                label="Согласен на обработку персональных данных"
              />

              {/* Checkbox 3: Notifications (optional) */}
              <OnboardingCheckbox
                checked={notificationsConsent}
                onChange={() => setNotificationsConsent(!notificationsConsent)}
                label="Хочу получать уведомления о поступлении моих любимых позиций"
                optional
              />
            </div>

            {error && (
              <p className="text-[10px] text-[var(--red)] text-center mt-3">{error}</p>
            )}

            <SlideBottom
              current={currentSlide}
              onDot={goToSlide}
              buttonText={loading ? 'ЗАГРУЗКА...' : 'НАЧАТЬ'}
              onNext={handleRegister}
              disabled={!canSubmit}
            />
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
