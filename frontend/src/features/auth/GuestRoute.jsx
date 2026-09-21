import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetchCurrentSession } from './api'

export function GuestRoute({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let isMounted = true

    fetchCurrentSession()
      .then(() => {
        if (isMounted) setStatus('authenticated')
      })
      .catch(() => {
        if (isMounted) setStatus('unauthenticated')
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (status === 'checking') {
    return <p>Checking session...</p>
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
