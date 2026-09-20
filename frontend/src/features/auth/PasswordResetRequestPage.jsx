import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthCard } from '@/components/AuthCard'
import { FieldError } from '@/components/FieldError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from './api'

const GENERIC_CONFIRMATION =
  'If an account with that email exists, password reset instructions have been sent.'

export function PasswordResetRequestPage() {
  const [emailAddress, setEmailAddress] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!emailAddress.trim()) {
      setFieldError('Email address is required')
      return
    }
    setFieldError('')

    setIsSubmitting(true)
    try {
      await requestPasswordReset({ emailAddress })
    } finally {
      setIsSubmitting(false)
    }
    setMessage(GENERIC_CONFIRMATION)
  }

  return (
    <AuthCard
      title="Reset your password"
      footer={
        <Link to="/login" className="text-primary hover:underline">
          Back to login
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
          <FieldError>{fieldError}</FieldError>
        </div>
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </AuthCard>
  )
}
