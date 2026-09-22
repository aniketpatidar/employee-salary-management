import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { deactivateEmployee, fetchEmployeeFilterOptions, fetchEmployees } from './api'
import { EmployeeFilters } from './EmployeeFilters'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeeTable } from './EmployeeTable'
import { Pagination } from './Pagination'

const FILTER_KEYS = ['department', 'country', 'role', 'employment_type', 'status']

function readFilters(searchParams) {
  return FILTER_KEYS.reduce((filters, key) => {
    const value = searchParams.get(key)
    if (value) filters[key] = value
    return filters
  }, {})
}

function readPage(searchParams) {
  const page = Number(searchParams.get('page'))
  return page > 0 ? page : 1
}

export function EmployeeListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const page = readPage(searchParams)

  const [filterOptions, setFilterOptions] = useState(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [employeeData, setEmployeeData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingEmployeeId, setEditingEmployeeId] = useState(null)
  const [deactivateError, setDeactivateError] = useState('')

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

    fetchEmployees({ ...filters, page })
      .then((data) => {
        if (isMounted) setEmployeeData(data)
      })
      .catch(() => {
        if (isMounted) setLoadError('Unable to load employees right now.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [queryKey, refreshToken])

  function handleFilterChange(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setSearchParams(next)
  }

  function handlePageChange(nextPage) {
    const next = new URLSearchParams(searchParams)
    if (nextPage > 1) {
      next.set('page', String(nextPage))
    } else {
      next.delete('page')
    }
    setSearchParams(next)
  }

  function handleSaved() {
    setIsAddModalOpen(false)
    setEditingEmployeeId(null)
    setRefreshToken((token) => token + 1)
  }

  async function handleDeactivate(employee) {
    const confirmed = window.confirm(`Deactivate ${employee.full_name}?`)
    if (!confirmed) return

    setDeactivateError('')
    try {
      await deactivateEmployee(employee.id)
      setRefreshToken((token) => token + 1)
    } catch {
      setDeactivateError('Unable to deactivate employee right now.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <EmployeeFilters filters={filters} options={filterOptions} onChange={handleFilterChange} />
        <Button type="button" onClick={() => setIsAddModalOpen(true)}>
          Add Employee
        </Button>
      </div>
      {filterOptionsError && <p className="text-sm text-destructive">{filterOptionsError}</p>}
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      {deactivateError && <p className="text-sm text-destructive">{deactivateError}</p>}
      <EmployeeTable
        employees={employeeData?.employees ?? []}
        isLoading={isLoading}
        onEdit={setEditingEmployeeId}
        onDeactivate={handleDeactivate}
      />
      {employeeData && !loadError && (
        <Pagination
          page={employeeData.page}
          perPage={employeeData.per_page}
          totalCount={employeeData.total_count}
          onPageChange={handlePageChange}
        />
      )}
      {isAddModalOpen && (
        <EmployeeFormModal
          mode="add"
          filterOptions={filterOptions}
          onOpenChange={(open) => !open && setIsAddModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
      {editingEmployeeId && (
        <EmployeeFormModal
          mode="edit"
          employeeId={editingEmployeeId}
          filterOptions={filterOptions}
          onOpenChange={(open) => !open && setEditingEmployeeId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
