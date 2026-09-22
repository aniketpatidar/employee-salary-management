import { useSearchParams } from 'react-router-dom'

const FILTER_KEYS = ['department', 'country', 'role', 'employment_type', 'status']

export function readFiltersFromParams(searchParams) {
  return FILTER_KEYS.reduce((filters, key) => {
    const value = searchParams.get(key)
    if (value) filters[key] = value
    return filters
  }, {})
}

export function useUrlFilters({ resetKeysOnChange = [] } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFiltersFromParams(searchParams)

  function handleFilterChange(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    resetKeysOnChange.forEach((resetKey) => next.delete(resetKey))
    setSearchParams(next)
  }

  return { searchParams, setSearchParams, filters, handleFilterChange }
}
