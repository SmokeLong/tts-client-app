#!/usr/bin/env node
/**
 * Create медиа table via raw SQL and populate with all brands + lineups.
 */

const SUPABASE_URL = 'https://eaazhodmkmejfmbrmmwl.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhYXpob2Rta21lamZtYnJtbXdsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MDI0MywiZXhwIjoyMDg2MTI2MjQzfQ.1hPkFpVaWEFqFW0yo06-SlhbjZMYNBU8PKWf0RXGDJE'

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

// ── REST helpers ──
async function restSelect(table, query = '') {
  const encoded = encodeURIComponent(table)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${encoded}?${query}`, { headers })
  if (!res.ok) throw new Error(`SELECT ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function restInsert(table, rows) {
  const encoded = encodeURIComponent(table)
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${encoded}`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation,resolution=ignore-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`INSERT ${table}: ${res.status} ${text}`)
  }
  return res.json()
}

// ── Create table via pg_query function or SQL endpoint ──
async function tryCreateTable() {
  // Try creating an RPC function that creates the table
  // First, check if table already has data
  try {
    const data = await restSelect('медиа', 'select=id&limit=1')
    console.log('Table медиа already exists ✓')
    return true
  } catch (e) {
    if (e.message.includes('404') || e.message.includes('does not exist') || e.message.includes('relation')) {
      console.log('Table does not exist, need to create...')
      return false
    }
    // Other error — table might exist but has issues
    console.log('Check error:', e.message)
    return false
  }
}

async function main() {
  console.log('=== Create медиа table ===\n')

  const tableExists = await tryCreateTable()

  if (!tableExists) {
    console.log('\nTable needs to be created. Running SQL via management API...')

    // Try using Supabase Management API (requires project ref)
    // Project ref from URL: eaazhodmkmejfmbrmmwl
    const projectRef = 'eaazhodmkmejfmbrmmwl'

    const createSQL = `
      CREATE TABLE IF NOT EXISTS public.медиа (
        id SERIAL PRIMARY KEY,
        тип TEXT NOT NULL CHECK (тип IN ('brand', 'lineup')),
        ключ TEXT NOT NULL,
        фото_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(тип, ключ)
      );

      ALTER TABLE public.медиа ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'медиа' AND policyname = 'Чтение медиа для всех') THEN
          CREATE POLICY "Чтение медиа для всех" ON public.медиа FOR SELECT USING (true);
        END IF;
      END $$;

      GRANT ALL ON public.медиа TO service_role;
      GRANT USAGE, SELECT ON SEQUENCE public.медиа_id_seq TO service_role;
      GRANT SELECT ON public.медиа TO anon;
      GRANT SELECT ON public.медиа TO authenticated;
    `

    // Use the Supabase SQL API endpoint
    const sqlRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })

    // If that doesn't work, try pg_query via postgrest
    // Actually the best way is to use the `query` endpoint if available
    // Let's try creating via a DO block in a function

    // Create a temporary function to run our DDL
    const createFuncSQL = `
      CREATE OR REPLACE FUNCTION _temp_create_media()
      RETURNS void AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS public."медиа" (
          id SERIAL PRIMARY KEY,
          "тип" TEXT NOT NULL CHECK ("тип" IN ('brand', 'lineup')),
          "ключ" TEXT NOT NULL,
          "фото_url" TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE("тип", "ключ")
        );
        ALTER TABLE public."медиа" ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON public."медиа" TO service_role;
        GRANT SELECT ON public."медиа" TO anon;
        GRANT SELECT ON public."медиа" TO authenticated;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    // Try calling via RPC
    try {
      // First create the function
      const funcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_temp_create_media`, {
        method: 'POST',
        headers,
        body: '{}',
      })
      if (funcRes.ok) {
        console.log('Table created via RPC ✓')
      } else {
        console.log('RPC approach failed, trying alternate...')
        // The function might not exist yet. We need another way.
      }
    } catch (e) {
      console.log('RPC error:', e.message)
    }

    // Check again
    const exists2 = await tryCreateTable()
    if (!exists2) {
      console.log('\n❌ Could not auto-create table.')
      console.log('Please run this SQL in Supabase Dashboard → SQL Editor:\n')
      console.log(`CREATE TABLE IF NOT EXISTS public."медиа" (
  id SERIAL PRIMARY KEY,
  "тип" TEXT NOT NULL CHECK ("тип" IN ('brand', 'lineup')),
  "ключ" TEXT NOT NULL,
  "фото_url" TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE("тип", "ключ")
);

ALTER TABLE public."медиа" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Чтение медиа для всех" ON public."медиа" FOR SELECT USING (true);

GRANT ALL ON public."медиа" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."медиа_id_seq" TO service_role;
GRANT SELECT ON public."медиа" TO anon;
GRANT SELECT ON public."медиа" TO authenticated;`)
      console.log('\nThen re-run: node scripts/create-media-table.mjs')
      return
    }
  }

  // ── Populate ──
  console.log('\nFetching products...')
  const products = await restSelect('товары', 'select=бренд,линейка&активен=eq.true')
  console.log(`  ${products.length} active products`)

  // Unique brands
  const brands = [...new Set(products.map(p => p.бренд).filter(Boolean))].sort()
  console.log(`  ${brands.length} brands`)

  // Unique lineups
  const lineupMap = new Map()
  for (const p of products) {
    if (!p.бренд || !p.линейка) continue
    const key = `${p.бренд}::${p.линейка}`
    lineupMap.set(key, true)
  }
  console.log(`  ${lineupMap.size} lineups`)

  // Insert brands (upsert-like with ignore duplicates)
  const brandRows = brands.map(b => ({ тип: 'brand', ключ: b }))
  try {
    const inserted = await restInsert('медиа', brandRows)
    console.log(`  Inserted ${inserted.length} brands`)
  } catch (e) {
    console.log('  Brand insert:', e.message.substring(0, 100))
  }

  // Insert lineups
  const lineupRows = [...lineupMap.keys()].map(k => ({ тип: 'lineup', ключ: k }))
  try {
    const inserted = await restInsert('медиа', lineupRows)
    console.log(`  Inserted ${inserted.length} lineups`)
  } catch (e) {
    console.log('  Lineup insert:', e.message.substring(0, 100))
  }

  // Verify
  console.log('\n=== VERIFICATION ===')
  const all = await restSelect('медиа', 'select=*&order=тип,ключ')
  const brandEntries = all.filter(m => m.тип === 'brand')
  const lineupEntries = all.filter(m => m.тип === 'lineup')

  console.log(`  Brands:  ${brandEntries.length}`)
  console.log(`  Lineups: ${lineupEntries.length}`)
  console.log(`  Total:   ${all.length}`)

  // Check: every brand from товары is in медиа
  const mediaBrands = new Set(brandEntries.map(m => m.ключ))
  const missingBrands = brands.filter(b => !mediaBrands.has(b))
  if (missingBrands.length > 0) {
    console.log(`  ❌ Missing brands: ${missingBrands.join(', ')}`)
  } else {
    console.log(`  ✓ All ${brands.length} brands present`)
  }

  // Check: every lineup from товары is in медиа
  const mediaLineups = new Set(lineupEntries.map(m => m.ключ))
  const missingLineups = [...lineupMap.keys()].filter(k => !mediaLineups.has(k))
  if (missingLineups.length > 0) {
    console.log(`  ❌ Missing lineups: ${missingLineups.slice(0, 5).join(', ')}...`)
  } else {
    console.log(`  ✓ All ${lineupMap.size} lineups present`)
  }

  console.log('\nAll entries:')
  for (const m of all) {
    console.log(`  [${m.тип.padEnd(6)}] ${m.ключ}`)
  }

  console.log('\n=== DONE ===')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
