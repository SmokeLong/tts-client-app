import BottomNav from './BottomNav'

export default function AppShell({ children, hideNav = false }) {
  return (
    <div className="min-h-screen leather-bg">
      <div className="max-w-app mx-auto relative min-h-screen">
        <main className={hideNav ? '' : 'pb-24'}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  )
}
