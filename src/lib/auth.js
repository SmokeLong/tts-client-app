const AUTH_KEY = 'tts_auth_token'
const CLIENT_KEY = 'tts_client'

export function getSavedSession() {
  try {
    const token = localStorage.getItem(AUTH_KEY)
    const client = localStorage.getItem(CLIENT_KEY)
    if (token && client) {
      return { token, client: JSON.parse(client) }
    }
  } catch (e) {
    console.error('Failed to read session', e)
  }
  return null
}

export function saveSession(token, client) {
  localStorage.setItem(AUTH_KEY, token)
  localStorage.setItem(CLIENT_KEY, JSON.stringify(client))
}

export function clearSession() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem(CLIENT_KEY)
}
