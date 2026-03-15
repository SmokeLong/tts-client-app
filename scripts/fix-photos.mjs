#!/usr/bin/env node
/**
 * fix-photos.mjs — Match product-photos in Supabase Storage to products in DB.
 * Matches by артикул (article code) from filename prefix → DB.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-photos.mjs           # dry-run
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix-photos.mjs --apply   # apply updates
 *
 * Env vars (reads from .env.local automatically):
 *   VITE_SUPABASE_URL         — Supabase project URL
 *   VITE_SUPABASE_ANON_KEY    — Anon key (fallback for reads)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (for reading товары + updating)
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env.local ──
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local')
    const lines = readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([A-Za-z_]+)=(.+)$/)
      if (m) process.env[m[1]] = process.env[m[1]] || m[2].trim()
    }
  } catch {}
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')
const BUCKET = 'product-photos'

if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL')
  process.exit(1)
}

const READ_KEY = SERVICE_KEY || ANON_KEY
if (!READ_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

// ── API helpers ──
async function supaFetch(path, opts = {}) {
  const key = opts.key || READ_KEY
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
      'Content-Type': 'application/json',
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return res.json()
}

// ── List all storage files ──
async function listStorageFiles() {
  const data = await supaFetch(`/storage/v1/object/list/${BUCKET}`, {
    method: 'POST',
    body: JSON.stringify({ prefix: '', limit: 2000 }),
  })
  return data.map(f => f.name)
}

// ── Fetch products from base table (needs service_role) or view (anon) ──
async function fetchProducts() {
  const table = SERVICE_KEY ? 'товары' : 'товары_публичные'
  const encoded = encodeURIComponent(table)

  // Fetch in batches (PostgREST defaults to 1000)
  const allProducts = []
  let offset = 0
  const limit = 1000
  while (true) {
    const data = await supaFetch(
      `/rest/v1/${encoded}?select=*&limit=${limit}&offset=${offset}&order=id`,
      { key: SERVICE_KEY || ANON_KEY }
    )
    allProducts.push(...data)
    if (data.length < limit) break
    offset += limit
  }
  return allProducts
}

// ── Extract article code from filename ──
function extractArticle(filename) {
  const m = filename.match(/^(\d{3,6})_/)
  return m ? m[1] : null
}

// ── Match products to files ──
function matchByArticle(products, files) {
  // Build article → filename map
  const articleToFile = new Map()
  for (const f of files) {
    const article = extractArticle(f)
    if (article) {
      // If multiple files share an article, keep track of all
      if (!articleToFile.has(article)) {
        articleToFile.set(article, [])
      }
      articleToFile.get(article).push(f)
    }
  }

  const matches = []
  const unmatched = []

  for (const p of products) {
    if (p['фото_url']) continue // Already has a photo

    // Try to match by артикул field
    const articulRaw = p['артикул'] || p['airtable_id'] || ''
    const articul = String(articulRaw).replace(/\D/g, '').padStart(5, '0')

    // Also try just the raw number
    const articulNum = String(articulRaw).replace(/\D/g, '')

    let found = null
    if (articul && articleToFile.has(articul)) {
      found = articleToFile.get(articul)[0]
    } else if (articulNum && articleToFile.has(articulNum)) {
      found = articleToFile.get(articulNum)[0]
    }

    if (found) {
      matches.push({ product: p, file: found })
    } else {
      unmatched.push(p)
    }
  }

  return { matches, unmatched }
}

// ── Update DB ──
async function updatePhotoUrl(productId, photoUrl) {
  if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for --apply')
  const encoded = encodeURIComponent('товары')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${encoded}?id=eq.${productId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ 'фото_url': photoUrl }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Update failed for id=${productId}: ${res.status} ${text}`)
  }
}

// ── Main ──
async function main() {
  console.log(`Mode: ${SERVICE_KEY ? 'service_role (full access)' : 'anon (read-only view)'}`)
  console.log()

  console.log('Fetching storage files...')
  const allFiles = await listStorageFiles()
  console.log(`  ${allFiles.length} files in bucket`)

  console.log('Fetching products...')
  const products = await fetchProducts()
  console.log(`  ${products.length} products total`)

  const withPhoto = products.filter(p => p['фото_url'])
  const noPhoto = products.filter(p => !p['фото_url'])
  console.log(`  ${withPhoto.length} with photo, ${noPhoto.length} without`)

  // Check if we have артикул field
  const hasArticul = products.length > 0 && ('артикул' in products[0])
  console.log(`  артикул field: ${hasArticul ? 'YES' : 'NO (need service_role key)'}`)
  console.log()

  if (!hasArticul) {
    console.log('WARNING: Cannot match by article code without service_role key.')
    console.log('Set SUPABASE_SERVICE_ROLE_KEY to enable article-based matching.')
    console.log()
    console.log('Without it, we can only verify existing photo URLs.')
    console.log()
  }

  // Match
  const { matches, unmatched } = hasArticul
    ? matchByArticle(products, allFiles)
    : { matches: [], unmatched: noPhoto }

  if (matches.length > 0) {
    console.log(`=== MATCHES BY ARTICLE (${matches.length}) ===`)
    for (const m of matches) {
      const p = m.product
      const art = p['артикул'] || p['airtable_id'] || '?'
      console.log(`  art=${art} id=${p.id} "${p['бренд']} ${p['вкус'] || ''}" → ${m.file}`)
    }
  }

  if (unmatched.length > 0) {
    console.log(`\n=== UNMATCHED (${unmatched.length}) ===`)
    for (const p of unmatched.slice(0, 20)) {
      const art = hasArticul ? (p['артикул'] || '?') : ''
      console.log(`  ${art ? `art=${art} ` : ''}id=${p.id} "${p['бренд'] || '?'} ${p['вкус'] || ''}"`)
    }
    if (unmatched.length > 20) console.log(`  ... and ${unmatched.length - 20} more`)
  }

  // Generate SQL
  if (matches.length > 0) {
    console.log('\n=== SQL UPDATE STATEMENTS ===')
    console.log('-- Run these in Supabase SQL Editor if not using --apply')
    for (const m of matches) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(m.file).replace(/%2F/g, '/')}`
      const escapedUrl = url.replace(/'/g, "''")
      console.log(`UPDATE товары SET фото_url = '${escapedUrl}' WHERE id = ${m.product.id};`)
    }
  }

  // Apply
  if (APPLY && matches.length > 0) {
    if (!SERVICE_KEY) {
      console.error('\nERROR: --apply requires SUPABASE_SERVICE_ROLE_KEY env var')
      process.exit(1)
    }
    console.log(`\nApplying ${matches.length} updates...`)
    let ok = 0, fail = 0
    for (const m of matches) {
      const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${m.file}`
      try {
        await updatePhotoUrl(m.product.id, url)
        ok++
        if (ok % 10 === 0) console.log(`  Updated ${ok}/${matches.length}...`)
        await new Promise(r => setTimeout(r, 100))
      } catch (err) {
        fail++
        console.error(`  FAIL id=${m.product.id}: ${err.message}`)
      }
    }
    console.log(`Done: ${ok} updated, ${fail} failed`)
  } else if (APPLY && matches.length === 0) {
    console.log('\nNo matches to apply.')
  } else if (matches.length > 0) {
    console.log(`\nDry run. Use --apply to update DB.`)
  }

  // Verify 3 existing photo URLs
  console.log('\n=== VERIFICATION (3 random photos) ===')
  const toVerify = withPhoto.sort(() => Math.random() - 0.5).slice(0, 3)
  for (const p of toVerify) {
    try {
      const res = await fetch(p['фото_url'], { method: 'HEAD' })
      const fname = p['фото_url'].split('/').pop()
      console.log(`  ${res.status} — id=${p.id} ${decodeURIComponent(fname).substring(0, 60)}`)
    } catch (err) {
      console.log(`  FAIL — id=${p.id}: ${err.message}`)
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===')
  console.log(`  Total products: ${products.length}`)
  console.log(`  With photo:     ${withPhoto.length}`)
  console.log(`  Matched now:    ${matches.length}`)
  console.log(`  Still missing:  ${unmatched.length}`)
  console.log(`  Storage files:  ${allFiles.length}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
