import { AppLayout } from './components/AppLayout'
import { EmployeeListPage } from './features/employees/EmployeeListPage'

export function DashboardPage() {
  return (
    <AppLayout>
      <EmployeeListPage />
    </AppLayout>
  )
}
