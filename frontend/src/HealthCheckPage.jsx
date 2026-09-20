import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchHealthCheck } from './lib/apiClient'

export function HealthCheckPage() {
  const [healthStatus, setHealthStatus] = useState('checking...')

  useEffect(() => {
    fetchHealthCheck()
      .then((data) => setHealthStatus(data.status))
      .catch(() => setHealthStatus('unreachable'))
  }, [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-xl">Employee Salary Management</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">API health check: {healthStatus}</p>
          <Button asChild>
            <Link to="/login">HR Manager login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
