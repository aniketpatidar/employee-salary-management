import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { fetchCurrentSession } from './api'

export function ProtectedRoute({ children }) {
  const location = useLocation()
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

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}
