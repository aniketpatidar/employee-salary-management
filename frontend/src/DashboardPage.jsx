import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from './features/auth/api'
import { EmployeeListPage } from './features/employees/EmployeeListPage'

export function DashboardPage() {
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
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Employee Salary Management</h1>
        <Button type="button" variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </Button>
      </header>
      <EmployeeListPage />
    </main>
  )
}
