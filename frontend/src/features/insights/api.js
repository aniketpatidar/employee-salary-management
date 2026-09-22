import { apiRequest, buildQueryString } from '../../lib/apiClient'

export function fetchPayInsights(params = {}) {
  const query = buildQueryString(params)
  return apiRequest(`/pay_insights${query ? `?${query}` : ''}`)
}
