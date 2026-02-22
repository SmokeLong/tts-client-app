// Проверяем сохранённую сессию
export function getSavedSession() {
  try {
    const token = localStorage.getItem('tts_auth_token')
    const client = localStorage.getItem('tts_client_data')
    if (token && client) {
      return {
        token: JSON.parse(token),
        client: JSON.parse(client)
      }
    }
  } catch (e) {}
  return null
}

export function clearSession() {
  localStorage.removeItem('tts_auth_token')
  localStorage.removeItem('tts_client_data')
}
