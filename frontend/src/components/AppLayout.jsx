import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/features/auth/api'

const NAV_LINKS = [
  { to: '/dashboard', label: 'Employees' },
  { to: '/insights', label: 'Pay Insights' },
]

function navLinkClassName({ isActive }) {
  return `text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`
}

export function AppLayout({ children }) {
  const navigate = useNavigate()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Employee Salary Management</h1>
        <nav className="flex items-center gap-4">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={navLinkClassName}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <Button type="button" variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </header>
      {children}
    </main>
  )
}
