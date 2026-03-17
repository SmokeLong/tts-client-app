#!/usr/bin/env node
/**
 * supplier3-upload.mjs — Upload supplier3_images to Supabase Storage
 * and match to products in DB by бренд + крепость + вкус (fuzzy).
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const SUPABASE_URL = 'https://eaazhodmkmejfmbrmmwl.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhYXpob2Rta21lamZtYnJtbXdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MDI0MywiZXhwIjoyMDg2MTI2MjQzfQ.1hPkFpVaWEFqFW0yo06-SlhbjZMYNBU8PKWf0RXGDJE'
const BUCKET = 'product-photos'
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
const SRC_DIR = path.join(process.env.HOME, 'Downloads/supplier3_images')

// ── Transliteration ──
const TRANSLIT = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
  'з':'z','и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o',
  'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'ts',
  'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh',
  'З':'Z','И':'I','Й':'J','К':'K','Л':'L','М':'M','Н':'N','О':'O',
  'П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'H','Ц':'Ts',
  'Ч':'Ch','Ш':'Sh','Щ':'Sch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya'
}
function translit(s) { return s.split('').map(c => TRANSLIT[c] ?? c).join('') }
function norm(s) {
  if (!s) return ''
  return translit(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Brand mapping: filename keyword → DB бренд ──
const BRAND_MAP = {
  'ARQA': 'ARQA',
  'BLAX': 'BLAX',
  'CHN': 'CHN',
  'CORVUS': 'CORVUS',
  'DELTA': 'DLTA', 'DLTA': 'DLTA',
  'DRYMOST': 'DRYMOST',
  'ECLIPSE': 'DRYMOST', // Eclipse is Drymost sub-line
  'FAFF': 'FAFF',
  'FEDRS': 'FEDRS',     // will disambiguate ORIGINAL/REP later
  'GLITCH': 'GLITCH',
  'GUCCI': 'GUCCI',
  'HOTSPOT': 'ISTERIKA', // Hotspot = Isterika brand
  'ICEBERG': 'ICEBERG',
  'ICEBURN': 'ICEBURN',
  'ISTERIKA': 'ISTERIKA',
  'KASTA': 'KASTA',
  'LOOP': 'ВАТКИ LOOP',
  'LYFT': 'LYFT REP.',
  'MAD': 'MAD',
  'NICTECH': 'NICTECH',
  'ODENS': 'SWEEDEN',
  'PEREDOZ': 'PEREDOZ',
  'PODONKI': 'PODONKI',
  'PZDC': 'PZDC',
  'RANDM': 'R&M', 'R&M': 'R&M', 'RED_X_MAD': 'R&M',
  'SIBERIA': 'SWEEDEN',
  'SIMPSONS': 'SIMPSONS',
  'STALKER': 'STALKER',
  'SWEEDEN': 'SWEEDEN',
  'VELO': 'LYFT REP.',
  'ZLOY': 'ICEBURN',     // Zloy is Iceburn line
  'ТРИНАШКА': 'ТРИНАШКА',
  'ШОК': 'ШОК',
  'ШТОРМ': 'DRYMOST',
}

// ── Flavor synonym map for cross-language matching ──
const FLAVOR_SYNS = {
  'мята': ['mint','myata','mjata'], 'mint': ['мята'],
  'ментол': ['menthol'], 'menthol': ['ментол'],
  'жвачка': ['gum','bubble','bubblegum','babl'], 'gum': ['жвачка'],
  'кола': ['cola'], 'cola': ['кола'],
  'виноград': ['grape'], 'grape': ['виноград'],
  'манго': ['mango'], 'mango': ['манго'],
  'арбуз': ['watermelon'], 'watermelon': ['арбуз'],
  'персик': ['peach'], 'peach': ['персик'],
  'клубника': ['strawberry'], 'strawberry': ['клубника'],
  'яблоко': ['apple'], 'apple': ['яблоко'],
  'вишня': ['cherry'], 'cherry': ['вишня'],
  'лимон': ['lemon'], 'lemon': ['лимон'],
  'банан': ['banana'], 'banana': ['банан'],
  'дыня': ['melon'], 'melon': ['дыня'],
  'малина': ['raspberry'], 'raspberry': ['малина'],
  'ананас': ['pineapple'], 'pineapple': ['ананас'],
  'энергетик': ['energy','redbull','red bull','adrenaline'], 'energy': ['энергетик'],
  'ягоды': ['berries','berry'], 'berries': ['ягоды'],
  'кокос': ['coconut','bounty','баунти'], 'coconut': ['кокос'],
  'апельсин': ['orange'], 'orange': ['апельсин'],
  'кофе': ['coffee'], 'coffee': ['кофе'],
  'мохито': ['mojito'], 'mojito': ['мохито'],
  'кактус': ['cactus'], 'cactus': ['кактус'],
  'лайм': ['lime'], 'lime': ['лайм'],
  'грейпфрут': ['grapefruit'], 'grapefruit': ['грейпфрут'],
  'мармелад': ['marmalade','haribo','мишки'], 'marmalade': ['мармелад'],
  'пломбир': ['ice cream','сливочный'], 'ice cream': ['пломбир'],
  'баблгам': ['bubblegum','бабл гам','bubble gum'], 'bubblegum': ['баблгам','бабл гам'],
  'редбулл': ['redbull','red bull','энергетик'], 'redbull': ['редбулл'],
  'тутти': ['tutti'], 'tutti': ['тутти'],
  'абрикос': ['apricot'], 'apricot': ['абрикос'],
  'гранат': ['pomegranate','grenade'], 'pomegranate': ['гранат'],
  'киви': ['kiwi'], 'kiwi': ['киви'],
  'ежевика': ['blackberry'], 'blackberry': ['ежевика'],
  'черника': ['blueberry'], 'blueberry': ['черника'],
  'смородина': ['currant'], 'currant': ['смородина'],
  'фейхоа': ['feijoa'], 'feijoa': ['фейхоа'],
  'тархун': ['tarragon'], 'tarragon': ['тархун'],
  'барбарис': ['barberry'], 'barberry': ['барбарис'],
}

// ── Extract brand from folder name or filename ──
function extractBrandFromFolder(folderName) {
  // Folder: Основной_склад_1._ШАЙБЫ_ARQA_CLASSIC_(70_mg)
  // Extract after ШАЙБЫ_ / ВАТКИ_ / ЖИДКОСТИ_ / ЭСДН_
  const m = folderName.match(/(?:ШАЙБЫ|ВАТКИ|ЖИДКОСТИ|ЭСДН)_(.+?)_\(/)
  if (m) return m[1]
  const m2 = folderName.match(/(?:ШАЙБЫ|ВАТКИ|ЖИДКОСТИ|ЭСДН)_(.+?)$/)
  if (m2) return m2[1]
  return null
}

function extractStrengthFromFolder(folderName) {
  // (70_mg) or (65-150_mg) or (100-200_mg)
  const m = folderName.match(/\((\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)_mg\)/)
  if (!m) return null
  const parts = m[1].split('-')
  if (parts.length === 1) return parseInt(parts[0])
  // Return range
  return { min: parseInt(parts[0]), max: parseInt(parts[1]) }
}

function extractCategoryFromFolder(folderName) {
  if (folderName.includes('ШАЙБЫ')) return 'шайбы'
  if (folderName.includes('ВАТКИ')) return 'ватки'
  if (folderName.includes('ЖИДКОСТИ')) return 'жидкости'
  if (folderName.includes('ЭСДН')) return 'эсдн'
  return null
}

function mapBrand(rawBrand, folderName) {
  if (!rawBrand) return null
  const upper = rawBrand.toUpperCase()

  // FEDRS disambiguation
  if (upper.includes('FEDRS')) {
    if (folderName.includes('ОРИГИНАЛ') || upper.includes('ОРИГИНАЛ') || upper.includes('ORIGINAL')) return 'FEDRS ORIGINAL'
    if (folderName.includes('ДУБЛЬ') || upper.includes('ДУБЛЬ') || upper.includes('REP')) return 'FEDRS REP.'
    return 'FEDRS ORIGINAL' // default
  }

  // FAFF sub-brands
  if (upper.includes('FAFF') && upper.includes('PZDC')) return 'PZDC'
  if (upper.includes('FAFF') && upper.includes('RANDM')) return 'R&M'
  if (upper.includes('RED') && upper.includes('MAD')) return 'R&M'

  // Hotspot sub-brands
  if (upper.includes('HOTSPOT') && folderName.includes('ISTERIKA')) return 'ISTERIKA'

  // Check map
  const keys = Object.keys(BRAND_MAP).sort((a, b) => b.length - a.length)
  for (const k of keys) {
    if (upper.includes(k.toUpperCase()) || rawBrand.includes(k)) {
      return BRAND_MAP[k]
    }
  }
  return null
}

// Extract strength from filename: find numbers that look like mg values
function extractStrengthFromFilename(filename) {
  // Pattern: _BRAND_LINEUP_STRENGTH_FLAVOR or similar
  // Look for standalone numbers between 10-250 that could be mg
  const parts = filename.replace(/[_\s]+/g, '_').split('_')
  const candidates = []
  for (let i = 1; i < parts.length; i++) {
    const n = parseInt(parts[i])
    if (!isNaN(n) && n >= 10 && n <= 250 && /^\d+$/.test(parts[i])) {
      candidates.push({ val: n, idx: i })
    }
  }
  // Prefer the number that appears after brand-like tokens and before flavor-like tokens
  // Usually it's the first qualifying number after index 1
  if (candidates.length === 1) return candidates[0].val
  if (candidates.length > 1) {
    // Skip the first number (code), take the next one that's plausible
    return candidates[candidates.length > 2 ? 1 : 0].val
  }
  return null
}

// Extract flavor from filename: everything after the strength number
function extractFlavor(filename, folderCategory) {
  const base = filename.replace(/\.[^.]+$/, '') // remove extension
  const parts = base.replace(/[_\s]+/g, '_').split('_')

  // Remove leading code (4-digit number)
  let start = 0
  if (/^\d{3,5}$/.test(parts[0])) start = 1

  // Remove "Жидкость" / "ЭСДН" prefix
  if (parts[start] === 'Жидкость' || parts[start] === 'ЭСДН') start++

  // Find the strength number position
  let strengthIdx = -1
  for (let i = start; i < parts.length; i++) {
    const n = parseInt(parts[i])
    if (!isNaN(n) && n >= 10 && n <= 250 && /^\d+$/.test(parts[i])) {
      strengthIdx = i
    }
  }

  // Flavor is everything after the last strength-like number
  if (strengthIdx >= 0 && strengthIdx < parts.length - 1) {
    let flavorParts = parts.slice(strengthIdx + 1)
    // Remove noise words
    flavorParts = flavorParts.filter(p => !['ОРИГИНАЛ', 'ДУБЛЬ', 'MG', 'mg', 'RED', 'BULL'].includes(p))
    return flavorParts.join(' ')
  }

  // Fallback: take last 2-3 parts as flavor
  if (parts.length > start + 2) {
    return parts.slice(-2).join(' ')
  }
  return parts.slice(start).join(' ')
}

// ── Score matching between a product and an image ──
function scoreMatch(product, flavor, fileStrength, folderStrength, dbBrand) {
  const pFlavor = norm(product.вкус || '')
  const pName = norm(product.название || '')
  const fFlavor = norm(flavor)

  if (!pFlavor && !fFlavor) return 0

  let score = 0

  // 1. Strength match
  const pStr = Number(product.крепость) || 0
  if (fileStrength && pStr) {
    const diff = Math.abs(pStr - fileStrength)
    if (diff === 0) score += 10
    else if (diff <= 5) score += 7
    else if (diff <= 15) score += 3
    else if (diff <= 30) score += 1
    else score -= 5 // penalty for big mismatch
  } else if (folderStrength && pStr) {
    if (typeof folderStrength === 'number') {
      const diff = Math.abs(pStr - folderStrength)
      if (diff === 0) score += 8
      else if (diff <= 10) score += 5
      else if (diff <= 30) score += 2
    } else {
      // Range
      if (pStr >= folderStrength.min && pStr <= folderStrength.max) score += 5
    }
  }

  // 2. Direct token match
  const fTokens = fFlavor.split(' ').filter(w => w.length > 2 && !/^\d+$/.test(w))
  const pTokens = pFlavor.split(' ').filter(w => w.length > 2 && !/^\d+$/.test(w))
  const pAllTokens = [...new Set([...pTokens, ...pName.split(' ').filter(w => w.length > 2)])]

  let tokenMatches = 0
  for (const ft of fTokens) {
    for (const pt of pAllTokens) {
      if (ft === pt) { score += 5; tokenMatches++; break }
      if (ft.length >= 4 && pt.length >= 4 && (ft.startsWith(pt) || pt.startsWith(ft))) { score += 3; tokenMatches++; break }
      if (ft.length >= 5 && pt.length >= 5 && (ft.includes(pt) || pt.includes(ft))) { score += 2; tokenMatches++; break }
    }
  }

  // 3. Synonym match
  for (const ft of fTokens) {
    const syns = FLAVOR_SYNS[ft.toLowerCase()] || FLAVOR_SYNS[translit(ft).toLowerCase()] || []
    for (const syn of syns) {
      const synNorm = norm(syn)
      for (const pt of pTokens) {
        if (pt.includes(synNorm) || synNorm.includes(pt)) { score += 3; break }
      }
    }
  }

  // 4. Substring match of flavor text
  if (fFlavor.length > 4 && pFlavor.length > 4) {
    const short = fFlavor.length < pFlavor.length ? fFlavor : pFlavor
    const long = fFlavor.length < pFlavor.length ? pFlavor : fFlavor
    if (long.includes(short)) score += 8
    else {
      // Check first significant word
      const mainWord = short.split(' ').find(w => w.length >= 4)
      if (mainWord && long.includes(mainWord)) score += 4
    }
  }

  return score
}

// ── Find all images ──
function findAllImages() {
  const imgs = []
  function walk(dir, folderName) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name)
      if (e.isDirectory()) walk(f, e.name)
      else if (/\.(jpg|jpeg|png|webp)$/i.test(e.name)) {
        imgs.push({ path: f, filename: e.name, folder: folderName || path.basename(dir) })
      }
    }
  }
  walk(SRC_DIR, '')
  return imgs
}

// ── Generate ASCII storage name ──
function makeStorageName(productId, brand, strength, flavor) {
  let b = translit(brand || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_')
  let f = translit(flavor || 'unknown').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').substring(0, 60)
  let s = String(strength || 0)
  return `${productId}_${b}_${s}_${f}.png`.replace(/_+/g, '_').replace(/_\./g, '.')
}

// ── Main ──
async function main() {
  console.log('=== Supplier3 Photo Upload ===\n')

  // Step 0: Ensure bucket exists and is public
  console.log('Checking bucket...')
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) console.error('Bucket create error:', error.message)
    else console.log('Created bucket:', BUCKET)
  } else {
    console.log('Bucket exists:', BUCKET)
  }

  // Step 1: Load products
  console.log('\nLoading products...')
  const { data: products, error: pErr } = await supabase
    .from('товары')
    .select('id, бренд, вкус, крепость, название, линейка, категория, фото_url')
    .order('id')
  if (pErr) { console.error('DB error:', pErr.message); return }
  console.log(`  ${products.length} products total`)
  console.log(`  ${products.filter(p => p.фото_url).length} with photo`)
  console.log(`  ${products.filter(p => !p.фото_url).length} without photo`)

  // Build brand index
  const brandIndex = {}
  for (const p of products) {
    const b = (p.бренд || '').toUpperCase()
    if (!brandIndex[b]) brandIndex[b] = []
    brandIndex[b].push(p)
  }

  // Step 2: Find all images and parse
  console.log('\nScanning images...')
  const images = findAllImages()
  console.log(`  ${images.length} images found`)

  // Step 3: Match each image
  const productPhotoMap = {} // productId → { imgPath, score, storageName, flavor }
  const unmatchedFiles = []

  for (const img of images) {
    const folder = img.folder
    const category = extractCategoryFromFolder(folder)
    const folderBrandRaw = extractBrandFromFolder(folder)
    const folderStrength = extractStrengthFromFolder(folder)
    const dbBrand = mapBrand(folderBrandRaw, folder)

    // Also try mapping brand from filename directly
    const fileBase = img.filename.replace(/\.[^.]+$/, '')
    let fileBrand = dbBrand
    if (!fileBrand) {
      // Try filename brand extraction
      const keys = Object.keys(BRAND_MAP).sort((a, b) => b.length - a.length)
      for (const k of keys) {
        if (fileBase.toUpperCase().includes(k.toUpperCase())) {
          fileBrand = BRAND_MAP[k]
          break
        }
      }
      // Try Cyrillic
      if (!fileBrand) {
        if (fileBase.includes('ШОК') || fileBase.includes('Шок')) fileBrand = 'ШОК'
        if (fileBase.includes('Тринашка') || fileBase.includes('ТРИНАШКА')) fileBrand = 'ТРИНАШКА'
      }
    }

    // FEDRS disambiguation from filename
    if (fileBrand === 'FEDRS' || fileBrand === 'FEDRS ORIGINAL') {
      if (folder.includes('ДУБЛЬ') || fileBase.includes('ДУБЛЬ')) fileBrand = 'FEDRS REP.'
      else fileBrand = 'FEDRS ORIGINAL'
    }

    // FAFF sub-brands from folder
    if (folder.includes('FAFF_PZDC')) fileBrand = 'PZDC'
    if (folder.includes('FAFF_RANDM') || folder.includes('RED_X_MAD')) fileBrand = 'R&M'

    const fileStrength = extractStrengthFromFilename(fileBase)
    const flavor = extractFlavor(fileBase, category)

    // Skip ЖИДКОСТИ and ЭСДН categories — no matching products in DB
    if (category === 'жидкости' || category === 'эсдн') {
      unmatchedFiles.push({ file: img.filename, reason: `category ${category} not in DB`, brand: fileBrand })
      continue
    }

    if (!fileBrand) {
      unmatchedFiles.push({ file: img.filename, reason: 'no brand match', brand: folderBrandRaw })
      continue
    }

    // Get candidates
    let candidates = brandIndex[fileBrand.toUpperCase()] || []

    // Also check partial brand matches
    if (candidates.length === 0) {
      for (const [k, v] of Object.entries(brandIndex)) {
        if (k.includes(fileBrand.toUpperCase()) || fileBrand.toUpperCase().includes(k)) {
          candidates.push(...v)
        }
      }
    }

    if (candidates.length === 0) {
      unmatchedFiles.push({ file: img.filename, reason: `brand "${fileBrand}" not in DB`, brand: fileBrand })
      continue
    }

    // Score all candidates
    let bestScore = 0
    let bestProduct = null

    for (const p of candidates) {
      const s = scoreMatch(p, flavor, fileStrength, folderStrength, fileBrand)
      if (s > bestScore) {
        bestScore = s
        bestProduct = p
      }
    }

    if (bestProduct && bestScore >= 5) {
      const existing = productPhotoMap[bestProduct.id]
      if (!existing || bestScore > existing.score) {
        productPhotoMap[bestProduct.id] = {
          imgPath: img.path,
          score: bestScore,
          storageName: makeStorageName(bestProduct.id, bestProduct.бренд, bestProduct.крепость, bestProduct.вкус),
          productName: bestProduct.название,
          flavor,
          brand: fileBrand,
          fileStrength,
        }
      }
    } else {
      unmatchedFiles.push({
        file: img.filename,
        reason: `low score ${bestScore}`,
        brand: fileBrand,
        bestMatch: bestProduct?.название,
        bestFlavor: bestProduct?.вкус,
      })
    }
  }

  const matched = Object.keys(productPhotoMap).length
  console.log(`\n=== MATCHING RESULTS ===`)
  console.log(`  Matched: ${matched} unique products`)
  console.log(`  Unmatched: ${unmatchedFiles.length} files`)

  // Show sample matches
  console.log('\nSample matches (first 20):')
  for (const [pid, m] of Object.entries(productPhotoMap).slice(0, 20)) {
    console.log(`  #${pid} "${m.productName}" ← ${m.flavor} (score:${m.score}, str:${m.fileStrength})`)
  }

  // Step 4: Upload matched images to Storage
  console.log(`\n=== UPLOADING ${matched} images ===`)
  const usedNames = new Set()
  let uploaded = 0, uploadErr = 0

  const entries = Object.entries(productPhotoMap)
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)
    await Promise.all(batch.map(async ([pid, info]) => {
      let name = info.storageName
      // Deduplicate
      let c = 1
      while (usedNames.has(name.toLowerCase())) { name = name.replace('.png', `_${c++}.png`) }
      usedNames.add(name.toLowerCase())
      info.storageName = name

      try {
        const buf = fs.readFileSync(info.imgPath)
        const ct = info.imgPath.endsWith('.jpg') || info.imgPath.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'
        const { error } = await supabase.storage.from(BUCKET).upload(name, buf, { contentType: ct, upsert: true })
        if (error) {
          uploadErr++
          if (uploadErr <= 5) console.error(`  Upload err: ${name}: ${error.message}`)
        } else {
          uploaded++
        }
      } catch (e) {
        uploadErr++
        if (uploadErr <= 5) console.error(`  Read err: ${info.imgPath}: ${e.message}`)
      }
    }))
    if ((i + 5) % 50 < 5) console.log(`  ${Math.min(i + 5, entries.length)}/${entries.length}`)
  }
  console.log(`  Uploaded: ${uploaded}, errors: ${uploadErr}`)

  // Step 5: Update DB
  console.log('\n=== UPDATING DB ===')
  let dbUpdated = 0, dbErr = 0

  for (const [pid, info] of entries) {
    const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(info.storageName)}`
    const { error } = await supabase
      .from('товары')
      .update({ фото_url: photoUrl })
      .eq('id', parseInt(pid))
    if (error) {
      dbErr++
      if (dbErr <= 5) console.error(`  DB err #${pid}: ${error.message}`)
    } else {
      dbUpdated++
    }
  }
  console.log(`  Updated: ${dbUpdated}, errors: ${dbErr}`)

  // Step 6: Log unmatched
  console.log(`\n=== UNMATCHED FILES (${unmatchedFiles.length}) ===`)
  // Group by reason
  const byReason = {}
  for (const u of unmatchedFiles) {
    const r = u.reason.split(' ')[0]
    if (!byReason[r]) byReason[r] = []
    byReason[r].push(u)
  }
  for (const [reason, items] of Object.entries(byReason)) {
    console.log(`\n  --- ${reason} (${items.length}) ---`)
    for (const u of items.slice(0, 10)) {
      console.log(`    ${u.file.substring(0, 80)} | brand=${u.brand} | ${u.reason}${u.bestMatch ? ` | best="${u.bestMatch}"` : ''}`)
    }
    if (items.length > 10) console.log(`    ... and ${items.length - 10} more`)
  }

  // Summary
  console.log('\n=== SUMMARY ===')
  console.log(`  Total images scanned: ${images.length}`)
  console.log(`  Matched to products:  ${matched}`)
  console.log(`  Uploaded to storage:  ${uploaded}`)
  console.log(`  DB records updated:   ${dbUpdated}`)
  console.log(`  Unmatched files:      ${unmatchedFiles.length}`)
  console.log('\n=== DONE ===')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
