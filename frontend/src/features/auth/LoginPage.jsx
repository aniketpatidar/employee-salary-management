import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { FieldError } from '@/components/FieldError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from './api'

function validate({ emailAddress, password }) {
  const errors = {}
  if (!emailAddress.trim()) errors.emailAddress = 'Email address is required'
  if (!password) errors.password = 'Password is required'
  return errors
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const errors = validate({ emailAddress, password })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await login({ emailAddress, password })
      const redirectTo = location.state?.from?.pathname ?? '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch {
      setFormError('Invalid email or password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="HR Manager Login"
      footer={
        <Link to="/passwords/new" className="text-primary hover:underline">
          Forgot your password?
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email_address">Email address</Label>
          <Input
            id="email_address"
            name="email_address"
            type="email"
            autoComplete="username"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
          />
          <FieldError>{fieldErrors.emailAddress}</FieldError>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldError>{fieldErrors.password}</FieldError>
        </div>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  )
}
