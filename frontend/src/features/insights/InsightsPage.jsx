import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmployeeFilters } from '../employees/EmployeeFilters'
import { fetchEmployeeFilterOptions } from '../employees/api'
import { fetchPayInsights } from './api'
import { BreakdownSelect } from './BreakdownSelect'
import { InsightsTable } from './InsightsTable'

const FILTER_KEYS = ['department', 'country', 'role', 'employment_type', 'status']
const DEFAULT_BREAKDOWN = 'department'

function readFilters(searchParams) {
  return FILTER_KEYS.reduce((filters, key) => {
    const value = searchParams.get(key)
    if (value) filters[key] = value
    return filters
  }, {})
}

function readBreakdown(searchParams) {
  return searchParams.get('breakdown') || DEFAULT_BREAKDOWN
}

export function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const breakdown = readBreakdown(searchParams)

  const [filterOptions, setFilterOptions] = useState(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetchEmployeeFilterOptions()
      .then((options) => {
        setFilterOptions(options)
        setFilterOptionsError('')
      })
      .catch(() => {
        setFilterOptions(null)
        setFilterOptionsError('Unable to load filter options.')
      })
  }, [])

  const queryKey = searchParams.toString()

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setLoadError('')

    fetchPayInsights({ ...filters, breakdown })
      .then((data) => {
        if (isMounted) setGroups(data.groups ?? [])
      })
      .catch(() => {
        if (isMounted) setLoadError('Unable to load pay insights right now.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [queryKey])

  function handleFilterChange(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    setSearchParams(next)
  }

  function handleBreakdownChange(value) {
    const next = new URLSearchParams(searchParams)
    if (value && value !== DEFAULT_BREAKDOWN) {
      next.set('breakdown', value)
    } else {
      next.delete('breakdown')
    }
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <EmployeeFilters filters={filters} options={filterOptions} onChange={handleFilterChange} />
        <BreakdownSelect value={breakdown} onChange={handleBreakdownChange} />
      </div>
      {filterOptionsError && <p className="text-sm text-destructive">{filterOptionsError}</p>}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pay insights…</p>
      ) : (
        !loadError && <InsightsTable groups={groups} />
      )}
    </div>
  )
}
