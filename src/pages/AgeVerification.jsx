import React from 'react'

function AgeVerification({ onVerified }) {
  return (
    <div className="min-h-screen bg-tts-dark flex flex-col items-center justify-center p-6">
      {/* Иконка */}
      <div className="w-20 h-20 bg-tts-warning/20 rounded-full flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-tts-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      
      {/* Заголовок */}
      <h1 className="text-2xl font-bold text-white text-center mb-4">
        Подтверждение возраста
      </h1>
      
      {/* Описание */}
      <p className="text-tts-muted text-center mb-8 max-w-xs">
        Данный магазин предназначен только для лиц, достигших 18 лет. 
        Пожалуйста, подтвердите свой возраст.
      </p>
      
      {/* Вопрос */}
      <div className="bg-tts-card rounded-2xl p-6 w-full max-w-sm mb-6">
        <p className="text-lg text-white text-center font-medium">
          Вам уже исполнилось 18 лет?
        </p>
      </div>
      
      {/* Кнопки */}
      <div className="flex gap-4 w-full max-w-sm">
        <button
          onClick={() => onVerified(false)}
          className="flex-1 bg-tts-card text-tts-muted py-4 rounded-xl font-medium transition-all active:scale-95"
        >
          Нет
        </button>
        <button
          onClick={() => onVerified(true)}
          className="flex-1 bg-tts-primary text-white py-4 rounded-xl font-medium transition-all active:scale-95"
        >
          Да, мне есть 18
        </button>
      </div>
      
      {/* Предупреждение */}
      <p className="text-tts-muted text-xs text-center mt-6 max-w-xs">
        Нажимая "Да", вы подтверждаете, что вам исполнилось 18 лет и вы принимаете ответственность за свои действия
      </p>
    </div>
  )
}

export default AgeVerification
