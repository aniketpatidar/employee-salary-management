import { apiRequest } from '../../lib/apiClient'

function buildQueryString(params) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return query.toString()
}

export function fetchPayInsights(params = {}) {
  const query = buildQueryString(params)
  return apiRequest(`/pay_insights${query ? `?${query}` : ''}`)
}
