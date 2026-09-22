import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { deactivateEmployee, fetchEmployeeFilterOptions, fetchEmployees } from './api'
import { EmployeeFilters } from './EmployeeFilters'
import { EmployeeFormModal } from './EmployeeFormModal'
import { EmployeeTable } from './EmployeeTable'
import { Pagination } from './Pagination'
import { readFiltersFromParams, useUrlFilters } from './useUrlFilters'

function readPage(searchParams) {
  const page = Number(searchParams.get('page'))
  return page > 0 ? page : 1
}

export function EmployeeListPage() {
  const { searchParams, setSearchParams, filters, handleFilterChange } = useUrlFilters({
    resetKeysOnChange: ['page'],
  })

  const [filterOptions, setFilterOptions] = useState(null)
  const [filterOptionsError, setFilterOptionsError] = useState('')
  const [employeeData, setEmployeeData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loadedRequestKey, setLoadedRequestKey] = useState(null)
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
  const requestKey = `${queryKey}::${refreshToken}`
  const isLoading = loadedRequestKey !== requestKey

  useEffect(() => {
    let isMounted = true
    const query = new URLSearchParams(queryKey)

    fetchEmployees({ ...readFiltersFromParams(query), page: readPage(query) })
      .then((data) => {
        if (!isMounted) return
        setEmployeeData(data)
        setLoadError('')
      })
      .catch(() => {
        if (!isMounted) return
        setLoadError('Unable to load employees right now.')
      })
      .finally(() => {
        if (isMounted) setLoadedRequestKey(requestKey)
      })

    return () => {
      isMounted = false
    }
  }, [queryKey, requestKey])

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
