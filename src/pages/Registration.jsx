import React, { useState } from 'react'
import { API_BASE } from '../App'

function Registration({ user, onRegistered }) {
  const [step, setStep] = useState(1)
  const [birthDate, setBirthDate] = useState('')
  const [consentData, setConsentData] = useState(false)
  const [consentNotify, setConsentNotify] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canProceed = birthDate && consentData

  const handleSubmit = async () => {
    if (!canProceed) return

    // Проверяем возраст
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    
    if (age < 18) {
      setError('Вам должно быть не менее 18 лет')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE}/tts-register-client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.telegram_id,
          username: user?.username,
          first_name: user?.first_name,
          last_name: user?.last_name,
          photo_url: user?.photo_url,
          birth_date: birthDate,
          consent_data: consentData,
          consent_notify: consentNotify
        })
      })

      const data = await response.json()
      
      if (data.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        onRegistered(data.client)
      } else {
        setError(data.error || 'Ошибка регистрации')
      }
    } catch (err) {
      setError('Ошибка соединения. Попробуйте позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-tts-dark p-6">
      {/* Заголовок */}
      <div className="text-center mb-8 pt-8">
        <div className="w-16 h-16 bg-gradient-to-br from-tts-primary to-tts-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">TTS</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Регистрация</h1>
        <p className="text-tts-muted">Для продолжения заполните данные</p>
      </div>

      {/* Приветствие */}
      {user?.first_name && (
        <div className="bg-tts-card rounded-2xl p-4 mb-6 flex items-center gap-4">
          {user.photo_url ? (
            <img 
              src={user.photo_url} 
              alt="" 
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 bg-tts-primary rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-white">
                {user.first_name.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <p className="text-white font-medium">Привет, {user.first_name}!</p>
            <p className="text-tts-muted text-sm">Осталось пара шагов</p>
          </div>
        </div>
      )}

      {/* Форма */}
      <div className="space-y-4">
        {/* Дата рождения */}
        <div className="bg-tts-card rounded-2xl p-4">
          <label className="block text-tts-muted text-sm mb-2">
            Дата рождения
          </label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full bg-tts-dark text-white py-3 px-4 rounded-xl border border-tts-card focus:border-tts-primary outline-none"
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
          />
        </div>

        {/* Согласия */}
        <div className="bg-tts-card rounded-2xl p-4 space-y-4">
          {/* Согласие на обработку данных */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={consentData}
                onChange={(e) => setConsentData(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all ${
                consentData 
                  ? 'bg-tts-primary border-tts-primary' 
                  : 'border-tts-muted'
              }`}>
                {consentData && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-white text-sm">
              Даю согласие на обработку персональных данных
              <span className="text-tts-danger">*</span>
            </span>
          </label>

          {/* Согласие на уведомления */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={consentNotify}
                onChange={(e) => setConsentNotify(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all ${
                consentNotify 
                  ? 'bg-tts-primary border-tts-primary' 
                  : 'border-tts-muted'
              }`}>
                {consentNotify && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-white text-sm">
              Хочу получать уведомления о подарках и поступлениях любимых позиций
            </span>
          </label>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="bg-tts-danger/20 text-tts-danger rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {/* Кнопка */}
        <button
          onClick={handleSubmit}
          disabled={!canProceed || loading}
          className={`w-full py-4 rounded-xl font-medium transition-all ${
            canProceed && !loading
              ? 'bg-tts-primary text-white active:scale-95'
              : 'bg-tts-card text-tts-muted cursor-not-allowed'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Регистрация...
            </span>
          ) : (
            'Продолжить'
          )}
        </button>
      </div>

      {/* Политика */}
      <p className="text-tts-muted text-xs text-center mt-6">
        Регистрируясь, вы соглашаетесь с условиями использования сервиса
      </p>
    </div>
  )
}

export default Registration
