import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import PageHeader from '../components/layout/PageHeader'

export default function Settings() {
  const navigate = useNavigate()
  const client = useAuthStore((s) => s.client)
  const updateClient = useAuthStore((s) => s.updateClient)
  const logout = useAuthStore((s) => s.logout)

  const [name, setName] = useState(client?.имя || '')
  const [birthday, setBirthday] = useState(client?.дата_рождения || '')
  const [saving, setSaving] = useState(false)

  // Notification toggles
  const [pushEnabled, setPushEnabled] = useState(true)
  const [favNotify, setFavNotify] = useState(true)
  const [closeNotify, setCloseNotify] = useState(false)
  const [promoNotify, setPromoNotify] = useState(true)

  // Preferences
  const [defaultPoint, setDefaultPoint] = useState('ЦЕНТР')
  const [defaultPayment, setDefaultPayment] = useState('НАЛИЧНЫЕ')

  const initial = client?.имя?.charAt(0)?.toUpperCase() || 'T'
  const phone = client?.телефон || '+7 (000) 000-00-00'

  async function handleSave() {
    if (!client?.id) return
    setSaving(true)

    const updates = {}
    if (name !== client.имя) updates['имя'] = name
    if (birthday !== client.дата_рождения) updates['дата_рождения'] = birthday

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('клиенты')
        .update(updates)
        .eq('id', client.id)

      if (!error) {
        updateClient(updates)
      }
    }

    setSaving(false)
  }

  function handleLogout() {
    logout()
    navigate('/onboarding')
  }

  const notifications = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
      title: 'PUSH-УВЕДОМЛЕНИЯ',
      desc: 'Статус заказа, акции',
      enabled: pushEnabled,
      toggle: setPushEnabled,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
      title: 'ТОВАРЫ ИЗ ИЗБРАННОГО',
      desc: 'Когда появятся в наличии',
      enabled: favNotify,
      toggle: setFavNotify,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      title: 'НАПОМИНАНИЕ О ЗАКРЫТИИ',
      desc: 'За 2 часа до закрытия точки',
      enabled: closeNotify,
      toggle: setCloseNotify,
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
      title: 'АКЦИИ И СКИДКИ',
      desc: 'Специальные предложения',
      enabled: promoNotify,
      toggle: setPromoNotify,
    },
  ]

  const supportItems = [
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
      title: 'НАПИСАТЬ В ПОДДЕРЖКУ',
      desc: 'Ответим быстро',
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      title: 'ПРАВИЛА И УСЛОВИЯ',
      desc: 'Как работает система скидок',
    },
    {
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      title: 'FAQ',
      desc: 'Частые вопросы',
    },
  ]

  const POINT_OPTIONS = ['ЦЕНТР', 'СЕВЕРНЫЙ', 'ЛБ']
  const PAYMENT_OPTIONS = ['НАЛИЧНЫЕ', 'БЕЗНАЛИЧНЫЕ']

  return (
    <div className="min-h-screen leather-bg">
      <div className="max-w-app mx-auto min-h-screen">
        <PageHeader title="НАСТРОЙКИ" />

        <div className="animate-fadeIn">
          {/* Profile Edit */}
          <div className="px-4 pt-4">
            <div className="p-5 bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] mb-3">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-[70px] h-[70px] rounded-full gold-gradient-bg flex items-center justify-center text-[28px] font-black text-[var(--bg-dark)] border-2 border-[var(--gold)]">
                    {initial}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--gold)] flex items-center justify-center cursor-pointer">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
                      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-[16px] font-extrabold text-[var(--gold-light)]">{(name || 'TTS Клиент').toUpperCase()}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">{phone}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[9px] text-[var(--text-muted)] tracking-wider mb-1.5 block">ИМЯ</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                    placeholder="Имя"
                    className="w-full bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-[10px] py-3 px-3.5 text-[12px] text-[var(--gold-light)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--gold)] font-[inherit]"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[var(--text-muted)] tracking-wider mb-1.5 block">ДАТА РОЖДЕНИЯ</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    onBlur={handleSave}
                    className="w-full bg-[rgba(212,175,55,0.05)] border border-[var(--border-gold)] rounded-[10px] py-3 px-3.5 text-[12px] text-[var(--gold-light)] outline-none focus:border-[var(--gold)] font-[inherit]"
                  />
                </div>
              </div>

              {saving && (
                <p className="text-[9px] text-[var(--green)] mt-2 text-center">Сохранение...</p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[var(--gold-dark)]">★</span>
              <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">УВЕДОМЛЕНИЯ</h3>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] overflow-hidden">
              {notifications.map((item, i) => (
                <div
                  key={item.title}
                  className={`p-3.5 flex items-center gap-3.5 ${
                    i > 0 ? 'border-t border-[var(--border-gold)]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
                    <div className="w-5 h-5 text-[var(--gold)]">{item.icon}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-[var(--gold-light)]">{item.title}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                  </div>
                  <div
                    onClick={() => item.toggle(!item.enabled)}
                    className={`w-12 h-[26px] rounded-full relative cursor-pointer transition-all shrink-0 ${
                      item.enabled ? 'bg-[var(--green)]' : 'bg-[rgba(100,100,100,0.3)]'
                    }`}
                  >
                    <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${
                      item.enabled ? 'left-[25px]' : 'left-[3px]'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[var(--gold-dark)]">★</span>
              <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">ПРЕДПОЧТЕНИЯ</h3>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] overflow-hidden">
              {/* Default point */}
              <div className="p-3.5 flex items-center gap-3.5 border-b border-[var(--border-gold)]">
                <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">ТОЧКА ПО УМОЛЧАНИЮ</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">Для быстрого заказа</p>
                </div>
                <select
                  value={defaultPoint}
                  onChange={(e) => setDefaultPoint(e.target.value)}
                  className="px-3 py-1.5 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-lg text-[10px] text-[var(--gold)] font-bold outline-none font-[inherit] appearance-none cursor-pointer"
                >
                  {POINT_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Default payment */}
              <div className="p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.5">
                    <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[var(--gold-light)]">СПОСОБ ОПЛАТЫ</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">По умолчанию</p>
                </div>
                <select
                  value={defaultPayment}
                  onChange={(e) => setDefaultPayment(e.target.value)}
                  className="px-3 py-1.5 bg-[rgba(212,175,55,0.1)] border border-[var(--border-gold)] rounded-lg text-[10px] text-[var(--gold)] font-bold outline-none font-[inherit] appearance-none cursor-pointer"
                >
                  {PAYMENT_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-[var(--gold-dark)]">★</span>
              <h3 className="text-[11px] font-bold text-[var(--gold)] tracking-[1.5px]">ПОДДЕРЖКА</h3>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-[14px] overflow-hidden">
              {supportItems.map((item, i) => (
                <div
                  key={item.title}
                  className={`p-3.5 flex items-center gap-3.5 cursor-pointer press-effect transition-all hover:bg-[rgba(212,175,55,0.05)] ${
                    i > 0 ? 'border-t border-[var(--border-gold)]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
                    <div className="w-5 h-5 text-[var(--gold)]">{item.icon}</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-[var(--gold-light)]">{item.title}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="px-4 mb-3">
            <button
              onClick={handleLogout}
              className="w-full p-3.5 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] text-[var(--red)] text-[11px] font-bold press-effect transition-all hover:bg-[rgba(248,113,113,0.2)] mb-2.5"
            >
              ВЫЙТИ ИЗ АККАУНТА
            </button>
            <button className="w-full p-3.5 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] text-[var(--red)] text-[11px] font-bold press-effect transition-all hover:bg-[rgba(248,113,113,0.2)]">
              УДАЛИТЬ АККАУНТ
            </button>
          </div>

          {/* App Info */}
          <div className="text-center py-5">
            <p className="text-[10px] text-[var(--text-muted)] mb-1.5">TTS App v2.0.0</p>
            <p className="text-[9px] text-[var(--text-muted)] opacity-60">Time To Snus. Все права защищены.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
