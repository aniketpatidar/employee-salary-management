function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function validateEmployeeForm(values) {
  const errors = {}

  if (!values.full_name?.trim()) errors.full_name = "Full name can't be blank"
  if (!values.department) errors.department = "Department can't be blank"
  if (!values.role) errors.role = "Role can't be blank"
  if (!values.country) errors.country = "Country can't be blank"
  if (!values.employment_type) errors.employment_type = "Employment type can't be blank"
  if (!values.pay_frequency) errors.pay_frequency = "Pay frequency can't be blank"

  if (!values.hire_date) {
    errors.hire_date = "Hire date can't be blank"
  } else if (values.hire_date > todayIsoDate()) {
    errors.hire_date = "Hire date can't be in the future"
  }

  const salary = Number(values.base_salary)
  if (values.base_salary === '' || values.base_salary === null || Number.isNaN(salary)) {
    errors.base_salary = 'Base salary must be a valid number'
  } else if (salary <= 0) {
    errors.base_salary = 'Base salary must be greater than 0'
  }

  return errors
}
