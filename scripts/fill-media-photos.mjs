#!/usr/bin/env node
/**
 * Fill медиа table with representative photos from products.
 * For each brand → take фото_url of first product that has one.
 * For each lineup → same.
 */

const SUPABASE_URL = 'https://eaazhodmkmejfmbrmmwl.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhYXpob2Rta21lamZtYnJtbXdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MDI0MywiZXhwIjoyMDg2MTI2MjQzfQ.1hPkFpVaWEFqFW0yo06-SlhbjZMYNBU8PKWf0RXGDJE'

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
}

async function restGet(table, query = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${query}`, { headers })
  if (!res.ok) throw new Error(`GET ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function restPatch(table, matchQuery, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?${matchQuery}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function main() {
  console.log('=== Fill медиа photos ===\n')

  // Load all active products with photos
  const products = await restGet('товары', 'select=id,бренд,линейка,фото_url,популярность&активен=eq.true&order=популярность.desc.nullslast,id')
  console.log(`${products.length} products loaded`)

  const withPhoto = products.filter(p => p.фото_url)
  console.log(`${withPhoto.length} have photos`)

  // Load current медиа
  const media = await restGet('медиа', 'select=*')
  console.log(`${media.length} медиа entries`)

  // Build brand → best photo map (most popular product with photo)
  const brandPhoto = {}
  for (const p of withPhoto) {
    if (!p.бренд) continue
    if (!brandPhoto[p.бренд]) brandPhoto[p.бренд] = p.фото_url
  }

  // Build lineup → best photo map
  const lineupPhoto = {}
  for (const p of withPhoto) {
    if (!p.бренд || !p.линейка) continue
    const key = `${p.бренд}::${p.линейка}`
    if (!lineupPhoto[key]) lineupPhoto[key] = p.фото_url
  }

  console.log(`\nBrand photos available: ${Object.keys(brandPhoto).length}/${media.filter(m => m.тип === 'brand').length}`)
  console.log(`Lineup photos available: ${Object.keys(lineupPhoto).length}/${media.filter(m => m.тип === 'lineup').length}`)

  // Update медиа
  let updated = 0, skipped = 0, noPhoto = 0

  for (const m of media) {
    if (m.фото_url) { skipped++; continue } // already has photo

    let photo = null
    if (m.тип === 'brand') {
      photo = brandPhoto[m.ключ]
    } else {
      photo = lineupPhoto[m.ключ]
    }

    if (!photo) { noPhoto++; continue }

    try {
      await restPatch('медиа', `id=eq.${m.id}`, { фото_url: photo })
      updated++
    } catch (e) {
      console.error(`  Error updating ${m.тип} "${m.ключ}": ${e.message.substring(0, 80)}`)
    }
  }

  console.log(`\nUpdated: ${updated}`)
  console.log(`Skipped (already had photo): ${skipped}`)
  console.log(`No photo available: ${noPhoto}`)

  // Verify
  const final = await restGet('медиа', 'select=*&order=тип,ключ')
  const withPhotoMedia = final.filter(m => m.фото_url)
  const noPhotoMedia = final.filter(m => !m.фото_url)

  console.log(`\n=== RESULT ===`)
  console.log(`With photo: ${withPhotoMedia.length}/${final.length}`)

  if (noPhotoMedia.length > 0) {
    console.log(`\nWithout photo (${noPhotoMedia.length}):`)
    for (const m of noPhotoMedia) {
      console.log(`  [${m.тип}] ${m.ключ}`)
    }
  }

  // Verify URLs work (sample 3)
  console.log('\nVerifying 3 random URLs...')
  const sample = withPhotoMedia.sort(() => Math.random() - 0.5).slice(0, 3)
  for (const m of sample) {
    try {
      const r = await fetch(m.фото_url, { method: 'HEAD' })
      console.log(`  ${r.status} [${m.тип}] ${m.ключ}`)
    } catch (e) {
      console.log(`  FAIL [${m.тип}] ${m.ключ}: ${e.message}`)
    }
  }

  console.log('\n=== DONE ===')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
