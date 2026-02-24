import { useToastStore } from '../../stores/toastStore'

const ICONS = {
  error: '❌',
  success: '✅',
  warning: '⚠️',
  info: 'ℹ️',
}

const STYLES = {
  error: 'bg-[rgba(248,113,113,0.15)] border-[rgba(248,113,113,0.4)] text-[var(--red)]',
  success: 'bg-[rgba(74,222,128,0.15)] border-[rgba(74,222,128,0.4)] text-[var(--green)]',
  warning: 'bg-[rgba(251,191,36,0.15)] border-[rgba(251,191,36,0.4)] text-[var(--yellow)]',
  info: 'bg-[rgba(96,165,250,0.15)] border-[rgba(96,165,250,0.4)] text-[var(--blue)]',
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-app px-4 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl ${
            STYLES[toast.type] || STYLES.error
          } ${toast.exiting ? 'toast-out' : 'toast-in'}`}
        >
          <span className="text-[16px] shrink-0">{ICONS[toast.type] || ICONS.error}</span>
          <span className="text-[11px] font-bold flex-1">{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-[14px] opacity-60 hover:opacity-100 press-effect shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
