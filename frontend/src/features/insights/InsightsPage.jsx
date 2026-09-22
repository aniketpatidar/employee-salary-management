import { useEffect, useState } from 'react'
import { EmployeeFilters } from '../employees/EmployeeFilters'
import { fetchEmployeeFilterOptions } from '../employees/api'
import { readFiltersFromParams, useUrlFilters } from '../employees/useUrlFilters'
import { fetchPayInsights } from './api'
import { BreakdownSelect } from './BreakdownSelect'
import { InsightsTable } from './InsightsTable'

const DEFAULT_BREAKDOWN = 'department'

function readBreakdown(searchParams) {
  return searchParams.get('breakdown') || DEFAULT_BREAKDOWN
}

export function InsightsPage() {
  const { searchParams, setSearchParams, filters, handleFilterChange } = useUrlFilters()
  const breakdown = readBreakdown(searchParams)

  const [filterOptions, setFilterOptions] = useState(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [groups, setGroups] = useState([])
  const [loadError, setLoadError] = useState('')
  const [loadedRequestKey, setLoadedRequestKey] = useState(null)

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
  const isLoading = loadedRequestKey !== queryKey

  useEffect(() => {
    let isMounted = true
    const query = new URLSearchParams(queryKey)

    fetchPayInsights({ ...readFiltersFromParams(query), breakdown: readBreakdown(query) })
      .then((data) => {
        if (!isMounted) return
        setGroups(data.groups ?? [])
        setLoadError('')
      })
      .catch(() => {
        if (!isMounted) return
        setLoadError('Unable to load pay insights right now.')
      })
      .finally(() => {
        if (isMounted) setLoadedRequestKey(queryKey)
      })

    return () => {
      isMounted = false
    }
  }, [queryKey])

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
