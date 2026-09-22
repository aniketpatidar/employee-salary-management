import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { humanizeEnumValue } from '@/lib/format'

const COLUMNS = ['Name', 'ID', 'Department', 'Role', 'Country', 'Employment Type', 'Status', 'Actions']

export function EmployeeTable({ employees, isLoading, onEdit, onDeactivate }) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading employees…</p>
  }

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees match the current filters.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <EmployeeRow key={employee.id} employee={employee} onEdit={onEdit} onDeactivate={onDeactivate} />
        ))}
      </TableBody>
    </Table>
  )
}

function EmployeeRow({ employee, onEdit, onDeactivate }) {
  const isActive = employee.status === 'active'

  return (
    <TableRow>
      <TableCell>{employee.full_name}</TableCell>
      <TableCell>{employee.id}</TableCell>
      <TableCell>{humanizeEnumValue(employee.department)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.role)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.country)}</TableCell>
      <TableCell>{humanizeEnumValue(employee.employment_type)}</TableCell>
      <TableCell>
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {humanizeEnumValue(employee.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onEdit(employee.id)}>
            Edit
          </Button>
          {isActive && (
            <Button type="button" variant="outline" size="sm" onClick={() => onDeactivate(employee)}>
              Deactivate
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
