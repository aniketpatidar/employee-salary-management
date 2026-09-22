import { apiRequest } from '../../lib/apiClient'

function buildQueryString(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return query.toString()
}

export function fetchEmployees(params = {}) {
  const query = buildQueryString(params)
  return apiRequest(`/employees${query ? `?${query}` : ''}`)
}

export function fetchEmployeeFilterOptions() {
  return apiRequest('/employees/filters')
}

export function fetchEmployee(id) {
  return apiRequest(`/employees/${id}`)
}

export function createEmployee(payload) {
  return apiRequest('/employees', { method: 'POST', body: payload })
}

export function updateEmployee(id, payload) {
  return apiRequest(`/employees/${id}`, { method: 'PATCH', body: payload })
}

export function deactivateEmployee(id) {
  return apiRequest(`/employees/${id}/deactivate`, { method: 'PATCH' })
}

export function fetchManagerOptions({ q = '', excludeId } = {}) {
  const query = buildQueryString({ q, exclude_id: excludeId })
  return apiRequest(`/employees/manager_options${query ? `?${query}` : ''}`)
}
