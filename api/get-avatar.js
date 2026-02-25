import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { client_id, telegram_id } = req.body
    if (!client_id || !telegram_id) {
      return res.status(400).json({ error: 'client_id и telegram_id обязательны' })
    }

    // Get user profile photos
    const photosRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${telegram_id}&limit=1`
    )
    const photosData = await photosRes.json()

    if (!photosData.ok || !photosData.result?.total_count) {
      return res.status(200).json({ avatar: null })
    }

    const photoSizes = photosData.result.photos[0]
    const bigPhoto = photoSizes[photoSizes.length - 1]

    // Get file path
    const fileRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${bigPhoto.file_id}`
    )
    const fileData = await fileRes.json()

    if (!fileData.ok) {
      return res.status(200).json({ avatar: null })
    }

    const avatarUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`

    // Cache in DB
    await supabase
      .from('клиенты')
      .update({ аватар: avatarUrl })
      .eq('id', client_id)

    return res.status(200).json({ avatar: avatarUrl })
  } catch (error) {
    console.error('Get avatar error:', error)
    res.status(500).json({ error: 'Ошибка получения аватара' })
  }
}
