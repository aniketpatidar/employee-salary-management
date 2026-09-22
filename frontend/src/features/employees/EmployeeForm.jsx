import { useState } from 'react'
import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { humanizeEnumValue } from '@/lib/format'
import { validateEmployeeForm } from './employeeFormValidation'
import { ManagerCombobox } from './ManagerCombobox'

const PAY_FREQUENCY_OPTIONS = ['monthly', 'annual']

function emptyValues() {
  return {
    full_name: '',
    department: '',
    role: '',
    country: '',
    base_salary: '',
    employment_type: '',
    pay_frequency: '',
    hire_date: '',
    manager_id: null,
  }
}

function joinServerErrors(serverErrors) {
  return Object.fromEntries(
    Object.entries(serverErrors ?? {}).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.join(', ') : messages,
    ]),
  )
}

export function EmployeeForm({
  initialValues,
  filterOptions,
  excludeManagerId,
  onSubmit,
  onCancel,
  isSubmitting,
  serverErrors,
}) {
  const [values, setValues] = useState({ ...emptyValues(), ...initialValues })
  const [managerLabel, setManagerLabel] = useState(initialValues?.manager?.full_name ?? '')
  const [clientErrors, setClientErrors] = useState({})

  const errors = { ...joinServerErrors(serverErrors), ...clientErrors }
  const currency = filterOptions?.country_currency?.[values.country]

  function updateField(field, value) {
    setValues((previous) => ({ ...previous, [field]: value }))
  }

  function handleManagerSelect(option) {
    updateField('manager_id', option.id)
    setManagerLabel(option.full_name)
  }

  function handleManagerClear() {
    updateField('manager_id', null)
    setManagerLabel('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const validationErrors = validateEmployeeForm(values)
    setClientErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return
    onSubmit(values)
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <TextField
          id="full_name"
          label="Full Name"
          value={values.full_name}
          onChange={(value) => updateField('full_name', value)}
          error={errors.full_name}
        />
      </div>

      <EnumField
        label="Department"
        value={values.department}
        options={filterOptions?.department ?? []}
        onChange={(value) => updateField('department', value)}
        error={errors.department}
      />

      <EnumField
        label="Role"
        value={values.role}
        options={filterOptions?.role ?? []}
        onChange={(value) => updateField('role', value)}
        error={errors.role}
      />

      <EnumField
        label="Country"
        value={values.country}
        options={filterOptions?.country ?? []}
        onChange={(value) => updateField('country', value)}
        error={errors.country}
      />

      <Field label="Currency" htmlFor="currency">
        <Input id="currency" value={currency ? currency.toUpperCase() : ''} readOnly disabled />
      </Field>

      <TextField
        id="base_salary"
        label="Annual base salary"
        type="number"
        step="0.01"
        value={values.base_salary}
        onChange={(value) => updateField('base_salary', value)}
        error={errors.base_salary}
      />

      <EnumField
        label="Employment Type"
        value={values.employment_type}
        options={filterOptions?.employment_type ?? []}
        onChange={(value) => updateField('employment_type', value)}
        error={errors.employment_type}
      />

      <EnumField
        label="Pay Frequency"
        value={values.pay_frequency}
        options={PAY_FREQUENCY_OPTIONS}
        onChange={(value) => updateField('pay_frequency', value)}
        error={errors.pay_frequency}
      />

      <TextField
        id="hire_date"
        label="Hire Date"
        type="date"
        value={values.hire_date}
        onChange={(value) => updateField('hire_date', value)}
        error={errors.hire_date}
      />

      <div className="sm:col-span-2">
        <Field label="Manager" error={errors.manager_id}>
          <ManagerCombobox
            value={values.manager_id}
            label={managerLabel}
            excludeId={excludeManagerId}
            onSelect={handleManagerSelect}
            onClear={handleManagerClear}
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  )
}

function TextField({ id, label, value, onChange, error, type = 'text', step }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError>{error}</FieldError>
    </div>
  )
}

function EnumField({ label, value, options, onChange, error }) {
  return (
    <Field label={label} error={error}>
      <Select value={value ?? ''} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((optionValue) => (
            <SelectItem key={optionValue} value={optionValue}>
              {humanizeEnumValue(optionValue)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
