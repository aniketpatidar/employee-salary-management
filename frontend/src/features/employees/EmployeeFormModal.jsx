import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/apiClient'
import { createEmployee, fetchEmployee, updateEmployee } from './api'
import { EmployeeForm } from './EmployeeForm'

const MODAL_TITLES = { add: 'Add Employee', edit: 'Edit Employee' }

export function EmployeeFormModal({ mode, employeeId, filterOptions, onOpenChange, onSaved }) {
  const [employee, setEmployee] = useState(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (mode !== 'edit') return
    let isMounted = true

    fetchEmployee(employeeId)
      .then((data) => {
        if (isMounted) setEmployee(data.employee)
      })
      .catch(() => {
        if (isMounted) setLoadError('Unable to load employee.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [mode, employeeId])

  async function handleSubmit(values) {
    setIsSubmitting(true)
    setServerErrors({})
    setFormError('')

    try {
      if (mode === 'edit') {
        await updateEmployee(employeeId, values)
      } else {
        await createEmployee(values)
      }
      onSaved()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        setServerErrors(error.data?.errors ?? {})
      } else {
        setFormError('Unable to save employee right now.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MODAL_TITLES[mode]}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <EmployeeForm
              initialValues={employee}
              filterOptions={filterOptions}
              excludeManagerId={mode === 'edit' ? employeeId : undefined}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
              isSubmitting={isSubmitting}
              serverErrors={serverErrors}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
