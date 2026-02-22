import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../App'
import BottomNav from '../components/BottomNav'

function Preorders() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [preorders, setPreorders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [products, setProducts] = useState([])
  const [points, setPoints] = useState([])
  const [formData, setFormData] = useState({
    product_id: '',
    point_id: '',
    quantity: 1
  })

  useEffect(() => {
    loadPreorders()
    loadFormData()
  }, [])

  const loadPreorders = async () => {
    try {
      const response = await fetch(`${API_BASE}/tts-preorders?telegram_id=${user?.telegram_id}`)
      const data = await response.json()
      if (data.preorders) {
        setPreorders(data.preorders)
      }
    } catch (error) {
      console.log('Ошибка загрузки предзаказов:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    try {
      const [productsRes, pointsRes] = await Promise.all([
        fetch(`${API_BASE}/tts-products-list`),
        fetch(`${API_BASE}/tts-points`)
      ])
      const productsData = await productsRes.json()
      const pointsData = await pointsRes.json()
      
      if (productsData.products) setProducts(productsData.products)
      if (pointsData.points) setPoints(pointsData.points.filter(p => p.type === 'МАГАЗИН'))
    } catch (error) {
      console.log('Ошибка загрузки данных формы:', error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.product_id || !formData.point_id) return

    try {
      const response = await fetch(`${API_BASE}/tts-create-preorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user?.telegram_id,
          ...formData
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
        setShowForm(false)
        setFormData({ product_id: '', point_id: '', quantity: 1 })
        loadPreorders()
      }
    } catch (error) {
      console.log('Ошибка создания предзаказа:', error)
    }
  }

  const cancelPreorder = async (preorderId) => {
    try {
      await fetch(`${API_BASE}/tts-cancel-preorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preorder_id: preorderId })
      })
      loadPreorders()
    } catch (error) {
      console.log('Ошибка отмены:', error)
    }
  }

  const getStatusInfo = (status) => {
    const statuses = {
      'Ожидает': { color: 'text-tts-warning', bg: 'bg-tts-warning/20' },
      'Завезли': { color: 'text-tts-success', bg: 'bg-tts-success/20' },
      'Уведомлен': { color: 'text-tts-primary', bg: 'bg-tts-primary/20' },
      'Отменен': { color: 'text-tts-danger', bg: 'bg-tts-danger/20' }
    }
    return statuses[status] || statuses['Ожидает']
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-tts-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-tts-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-tts-dark pb-24">
      {/* Шапка */}
      <div className="sticky top-0 z-10 bg-tts-dark/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-tts-card rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-white">Предзаказы</h1>
        </div>
        
        <button 
          onClick={() => setShowForm(true)}
          className="w-10 h-10 bg-tts-primary rounded-full flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Описание */}
      <div className="px-4 mb-4">
        <div className="bg-tts-primary/10 rounded-2xl p-4">
          <p className="text-tts-primary text-sm">
            🔔 Оставьте предзаказ на товар, которого сейчас нет. Мы уведомим вас, когда он появится на выбранной точке!
          </p>
        </div>
      </div>

      {preorders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-6xl mb-4">🔔</div>
          <p className="text-white font-medium mb-2">Предзаказов нет</p>
          <p className="text-tts-muted text-sm text-center mb-6">
            Создайте предзаказ на товар,<br/>который хотите получить
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Создать предзаказ
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {preorders.map(preorder => {
            const statusInfo = getStatusInfo(preorder.status)
            
            return (
              <div key={preorder.id} className="bg-tts-card rounded-2xl p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-tts-muted text-xs">{preorder.number}</p>
                    <p className="text-white font-medium">{preorder.product_name}</p>
                  </div>
                  <span className={`${statusInfo.bg} ${statusInfo.color} px-3 py-1 rounded-full text-xs font-medium`}>
                    {preorder.status}
                  </span>
                </div>
                
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-tts-muted">Точка:</span>
                  <span className="text-white">{preorder.point_name}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm mb-3">
                  <span className="text-tts-muted">Количество:</span>
                  <span className="text-white">{preorder.quantity} шт</span>
                </div>
                
                {preorder.status === 'Ожидает' && (
                  <button
                    onClick={() => cancelPreorder(preorder.id)}
                    className="w-full py-2 bg-tts-danger/20 text-tts-danger rounded-xl text-sm"
                  >
                    Отменить
                  </button>
                )}
                
                {preorder.status === 'Завезли' && (
                  <div className="bg-tts-success/10 rounded-xl p-3 text-center">
                    <p className="text-tts-success text-sm">✅ Товар вас ждёт!</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка создания предзаказа */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-tts-dark w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Новый предзаказ</h2>
              <button onClick={() => setShowForm(false)} className="text-tts-muted">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Выбор товара */}
            <div className="mb-4">
              <label className="text-tts-muted text-sm mb-2 block">Товар</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData(prev => ({ ...prev, product_id: e.target.value }))}
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none"
              >
                <option value="">Выберите товар</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.brand} - {p.name}</option>
                ))}
              </select>
            </div>

            {/* Выбор точки */}
            <div className="mb-4">
              <label className="text-tts-muted text-sm mb-2 block">Точка</label>
              <select
                value={formData.point_id}
                onChange={(e) => setFormData(prev => ({ ...prev, point_id: e.target.value }))}
                className="w-full bg-tts-card text-white py-3 px-4 rounded-xl outline-none"
              >
                <option value="">Выберите точку</option>
                {points.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Количество */}
            <div className="mb-6">
              <label className="text-tts-muted text-sm mb-2 block">Количество</label>
              <div className="flex items-center bg-tts-card rounded-xl">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                  className="w-12 h-12 flex items-center justify-center text-white text-xl"
                >
                  −
                </button>
                <span className="flex-1 text-center text-white font-medium">{formData.quantity}</span>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                  className="w-12 h-12 flex items-center justify-center text-white text-xl"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!formData.product_id || !formData.point_id}
              className={`w-full py-4 rounded-xl font-medium ${
                formData.product_id && formData.point_id
                  ? 'bg-tts-primary text-white'
                  : 'bg-tts-card text-tts-muted'
              }`}
            >
              Создать предзаказ
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Preorders
