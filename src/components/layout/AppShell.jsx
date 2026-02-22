import BottomNav from './BottomNav'

export default function AppShell({ children, hideNav = false }) {
  return (
    <div className="min-h-screen leather-bg" style={{ overflow: 'visible' }}>
      <div className="max-w-app mx-auto relative min-h-screen">
        <main className={hideNav ? '' : 'pb-28'}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
