import React from 'react'

function SplashScreen() {
  return (
    <div className="min-h-screen bg-tts-dark flex flex-col items-center justify-center">
      {/* Логотип */}
      <div className="w-24 h-24 bg-gradient-to-br from-tts-primary to-tts-secondary rounded-3xl flex items-center justify-center mb-6 animate-pulse">
        <span className="text-4xl font-bold text-white">TTS</span>
      </div>
      
      {/* Название */}
      <h1 className="text-2xl font-bold text-white mb-2">TTS Shop</h1>
      <p className="text-tts-muted text-sm">Загрузка...</p>
      
      {/* Индикатор загрузки */}
      <div className="mt-8 flex space-x-2">
        <div className="w-2 h-2 bg-tts-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-tts-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-tts-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )
}

export default SplashScreen
