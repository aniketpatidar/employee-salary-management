import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { FieldError } from '@/components/FieldError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '../../lib/apiClient'
import { confirmPasswordReset } from './api'

function toCamelCase(key) {
  return key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase())
}

function validate({ password, passwordConfirmation }) {
  const errors = {}
  if (!password) errors.password = 'Password is required'
  if (!passwordConfirmation) errors.passwordConfirmation = 'Password confirmation is required'
  return errors
}

export function PasswordResetConfirmPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const errors = validate({ password, passwordConfirmation })
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSubmitting(true)
    try {
      await confirmPasswordReset({ token, password, passwordConfirmation })
      navigate('/login', { replace: true })
    } catch (error) {
      handleSubmitError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleSubmitError(error) {
    if (error instanceof ApiError && error.status === 404) {
      setFormError('This password reset link is invalid or has expired.')
      return
    }

    if (error instanceof ApiError && error.data?.errors) {
      setFieldErrors(mapBackendErrors(error.data.errors))
      return
    }

    setFormError('Something went wrong. Please try again.')
  }

  function mapBackendErrors(errors) {
    return Object.fromEntries(
      Object.entries(errors).map(([field, messages]) => [toCamelCase(field), messages.join(', ')]),
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <FieldError>{fieldErrors.password}</FieldError>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password_confirmation">Confirm new password</Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
          <FieldError>{fieldErrors.passwordConfirmation}</FieldError>
        </div>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </AuthCard>
  )
}
