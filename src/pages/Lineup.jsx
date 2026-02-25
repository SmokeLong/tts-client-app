import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppShell from '../components/layout/AppShell'
import PageHeader from '../components/layout/PageHeader'
import ProductCard from '../components/product/ProductCard'

function mapProduct(raw) {
  return {
    id: raw.id,
    name: raw.название,
    brand: raw.бренд,
    lineup: raw.линейка,
    category: raw.категория,
    priceCash: raw.цена_нал,
    priceCard: raw.цена_безнал,
    strength: raw.крепость,
    flavor: raw.вкус,
    format: raw.формат_пакетов,
    packets: raw.кол_во_пакетов,
    photo: raw.фото_url,
    active: raw.активен,
  }
}

export default function Lineup() {
  const { id } = useParams()
  const [products, setProducts] = useState([])
  const [inventory, setInventory] = useState({})
  const [loading, setLoading] = useState(true)

  // Parse brand::lineup from URL param
  const decoded = decodeURIComponent(id)
  const [brandName, lineupName] = decoded.split('::')
  const isAll = lineupName === 'all'

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      let query = supabase.from('товары_публичные').select('*').eq('бренд', brandName).eq('активен', true)
      if (!isAll) {
        query = query.eq('линейка', lineupName)
      }

      const [prodRes, invRes] = await Promise.all([
        query,
        supabase.from('инвентарь').select('*'),
      ])

      if (prodRes.error) console.error('Lineup load error:', prodRes.error)
      if (prodRes.data) setProducts(prodRes.data.map(mapProduct))

      if (invRes.data) {
        const inv = {}
        for (const row of invRes.data) {
          if (!inv[row.товар_id]) inv[row.товар_id] = {}
          inv[row.товар_id][row.точка_id] = row.количество
        }
        setInventory(inv)
      }
    } catch (err) {
      console.error('Lineup load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function getStock(productId) {
    const inv = inventory[productId]
    if (!inv) return null
    return { center: inv[2] ?? 0, north: inv[3] ?? 0, lb: inv[4] ?? 0 }
  }

  const title = isAll ? brandName : lineupName

  return (
    <AppShell>
      <PageHeader title={title} showCart />
      <div className="px-4 py-4 animate-fadeIn">
        {/* Header info */}
        <div className="mb-4">
          <p className="text-[10px] text-[var(--text-muted)] tracking-[2px] mb-1">{brandName}</p>
          <h1 className="text-[20px] font-extrabold gold-gradient-text tracking-[1px] mb-1">
            {isAll ? 'ВСЕ ТОВАРЫ' : lineupName}
          </h1>
          <p className="text-[10px] text-[var(--text-muted)]">
            {products.length} {products.length === 1 ? 'товар' : 'товаров'}
          </p>
        </div>

        <div className="gold-divider mb-4" />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[36px] mb-3">📭</p>
            <p className="text-[12px] text-[var(--text-muted)]">Нет товаров</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pb-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} stock={getStock(p.id)} showFavorite />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
