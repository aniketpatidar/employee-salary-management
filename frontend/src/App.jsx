import { useEffect, useState } from 'react'
import { fetchHealthCheck } from './lib/apiClient'
import './App.css'

function App() {
  const [healthStatus, setHealthStatus] = useState('checking...')

  useEffect(() => {
    fetchHealthCheck()
      .then((data) => setHealthStatus(data.status))
      .catch(() => setHealthStatus('unreachable'))
  }, [])

  return (
    <main>
      <h1>Employee Salary Management</h1>
      <p>API health check: {healthStatus}</p>
    </main>
  )
}

export default App
