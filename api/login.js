import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const PERSDATA_URL = process.env.PERSDATA_API_URL || 'http://5.42.113.192'
const PERSDATA_KEY = process.env.PERSDATA_API_KEY || 'tts-persdata-key-2026-xK9mQ4'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { login, password } = req.body

    if (!login || !password) {
      return res.status(400).json({ error: 'Введите логин и пароль' })
    }

    // Find client by login
    const { data: client, error } = await supabase
      .from('клиенты')
      .select('*')
      .eq('логин', login)
      .single()

    if (error || !client) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    // SHA-256 compare
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== client.пароль_хеш) {
      return res.status(401).json({ error: 'Неверный логин или пароль' })
    }

    // Update activity
    await supabase
      .from('клиенты')
      .update({ последняя_активность: new Date().toISOString() })
      .eq('id', client.id)

    // 152-ФЗ: подтянуть персданные с русского VPS
    try {
      const persRes = await fetch(`${PERSDATA_URL}/api/clients/${client.id}`, {
        headers: { 'X-API-Key': PERSDATA_KEY },
      })
      if (persRes.ok) {
        const persData = await persRes.json()
        client._persdata = { name: persData.name, phone: persData.phone }
      }
    } catch (e) {
      console.error('PersData fetch error:', e)
    }

    res.status(200).json({ success: true, client })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Ошибка входа' })
  }
}
