#!/usr/bin/env node
/**
 * Merge all supplier image folders into one, organized by brand/lineup.
 * Output: ~/Desktop/all_photos/BRAND/LINEUP/filename.ext
 */
import fs from 'fs'
import path from 'path'

const HOME = process.env.HOME
const SOURCES = [
  path.join(HOME, 'Downloads/supplier2_images'),
  path.join(HOME, 'Downloads/supplier3_images'),
  path.join(HOME, 'Downloads/clean_photos'),
]
const OUT = path.join(HOME, 'Desktop/all_photos')

// ── Brand extraction from folder/filename ──
const BRAND_KEYS = [
  // Long names first
  'ICEBURN','ICEBERG','ISTERIKA','HOTSPOT','DRYMOST','ECLIPSE',
  'NICTECH','SIMPSONS','PODONKI','PEREDOZ','STALKER','SWEEDEN',
  'ТРИНАШКА','CORVUS','DELTA','GLITCH',
  'ARQA','BLAX','FAFF','FEDRS','KASTA','LOOP','LYFT','VELO',
  'ODENS','SIBERIA','GUCCI','MAD','PZDC','CHN','ШОК','ШТОРМ',
  'BJORN','CATS','CATSWILL','JAM','OGGO','ICE_FOX',
  'GEEK','PUFFMI','UPENDS','VOZOL','WAKA','ISOK','OUKITEL',
  'PLENA','PRAZE','VISO','HYPE','DOZA','RANDM','R&M','RED',
  'АНАРХИЯ','МОНАРХИЯ','ПСИХ','САМОУБИЙЦА',
]

function extractBrand(text) {
  const upper = text.toUpperCase()
  for (const b of BRAND_KEYS) {
    if (upper.includes(b.toUpperCase())) return b.toUpperCase()
  }
  return null
}

// ── Lineup extraction from folder name ──
function extractLineup(folderName, filename) {
  // supplier3 folders: Основной_склад_1._ШАЙБЫ_ARQA_CLASSIC_(70_mg)
  // Extract lineup part between brand and (mg)
  const brand = extractBrand(folderName)
  if (!brand) return 'OTHER'

  // Try to extract from folder
  const upper = folderName.toUpperCase()
  const brandIdx = upper.indexOf(brand)
  if (brandIdx >= 0) {
    let after = folderName.substring(brandIdx + brand.length).replace(/^[_\s]+/, '')
    // Remove (XXX_mg) suffix
    after = after.replace(/\(\d+[^)]*\)$/g, '').replace(/[_\s]+$/g, '')
    // Remove leading category markers
    after = after.replace(/^(ШАЙБЫ|ВАТКИ|ЖИДКОСТИ|ЭСДН|SNUS)[_\s]*/i, '')
    if (after.length > 0 && after.length < 40) return after.replace(/_/g, ' ').trim()
  }

  // Try to extract strength from filename as lineup proxy
  const mMg = filename.match(/[_\s](\d{2,3})[_\s]MG/i)
  if (mMg) return mMg[1] + ' MG'

  return 'OTHER'
}

// Category from folder
function extractCategory(folderName) {
  if (folderName.includes('ШАЙБЫ') || folderName.includes('SNUS')) return 'ШАЙБЫ'
  if (folderName.includes('ВАТКИ')) return 'ВАТКИ'
  if (folderName.includes('ЖИДКОСТИ')) return 'ЖИДКОСТИ'
  if (folderName.includes('ЭСДН')) return 'ЭСДН'
  return ''
}

// ── Collect all images ──
function findAllImages(srcDir) {
  const imgs = []
  if (!fs.existsSync(srcDir)) return imgs

  function walk(dir, parentFolder) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full, e.name)
      else if (/\.(jpg|jpeg|png|webp)$/i.test(e.name)) {
        imgs.push({ path: full, filename: e.name, folder: parentFolder || path.basename(dir) })
      }
    }
  }
  walk(srcDir, '')
  return imgs
}

// ── Main ──
function main() {
  console.log('=== Merging photos into ~/Desktop/all_photos/ ===\n')

  // Clean output dir
  if (fs.existsSync(OUT)) {
    fs.rmSync(OUT, { recursive: true })
    console.log('Cleaned old output dir')
  }

  let totalCopied = 0
  let totalSkipped = 0
  const seenFiles = new Set() // track by filename to avoid exact dupes

  for (const srcDir of SOURCES) {
    const srcName = path.basename(srcDir)
    console.log(`\nScanning ${srcName}...`)
    const images = findAllImages(srcDir)
    console.log(`  Found ${images.length} images`)

    for (const img of images) {
      // Skip exact filename duplicates (clean_photos is a copy of supplier2)
      const fileKey = img.filename.toLowerCase()
      if (seenFiles.has(fileKey)) {
        totalSkipped++
        continue
      }
      seenFiles.add(fileKey)

      // Determine brand
      let brand = extractBrand(img.folder) || extractBrand(img.filename)
      if (!brand) brand = 'OTHER'

      // Determine category
      const category = extractCategory(img.folder)

      // Determine lineup
      let lineup = extractLineup(img.folder, img.filename)
      // Clean up lineup
      lineup = lineup.replace(/[^\w\s\-().а-яА-ЯёЁ]/g, '').trim()
      if (!lineup || lineup === brand) lineup = 'OTHER'

      // Add category prefix for non-snus
      let brandDir = brand
      if (category && category !== 'ШАЙБЫ') {
        brandDir = `${category}_${brand}`
      }

      // Create dir and copy
      const outDir = path.join(OUT, brandDir, lineup)
      fs.mkdirSync(outDir, { recursive: true })

      const outPath = path.join(outDir, img.filename)
      if (!fs.existsSync(outPath)) {
        fs.copyFileSync(img.path, outPath)
        totalCopied++
      } else {
        // Add source suffix to avoid overwrite
        const ext = path.extname(img.filename)
        const base = path.basename(img.filename, ext)
        const altPath = path.join(outDir, `${base}_${srcName}${ext}`)
        fs.copyFileSync(img.path, altPath)
        totalCopied++
      }
    }
  }

  // Print summary
  console.log('\n=== SUMMARY ===')
  console.log(`  Copied: ${totalCopied}`)
  console.log(`  Skipped (dupes): ${totalSkipped}`)

  // List resulting structure
  console.log('\n=== STRUCTURE ===')
  const brands = fs.readdirSync(OUT).sort()
  for (const b of brands) {
    const bPath = path.join(OUT, b)
    if (!fs.statSync(bPath).isDirectory()) continue
    const lineups = fs.readdirSync(bPath).sort()
    const counts = lineups.map(l => {
      const lPath = path.join(bPath, l)
      return fs.statSync(lPath).isDirectory() ? fs.readdirSync(lPath).length : 0
    })
    const total = counts.reduce((a, b) => a + b, 0)
    console.log(`  ${b}/ (${total} фото)`)
    for (let i = 0; i < lineups.length; i++) {
      if (counts[i] > 0) console.log(`    ${lineups[i]}/ — ${counts[i]}`)
    }
  }

  console.log(`\n  Output: ${OUT}`)
  console.log('=== DONE ===')
}

main()
